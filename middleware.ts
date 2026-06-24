import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { Request, Response, NextFunction } from "express";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://uprykiqtdklubvhmrsai.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_JNlbM9HDsTj6ihBjoNbFWg_PdhU7aNN";

/**
 * Express middleware to validate Supabase authentication sessions server-side.
 * It uses `@supabase/ssr`'s `createServerClient` to parse, serialize, and refresh cookies automatically.
 */
export async function supabaseSessionMiddleware(req: Request, res: Response, next: NextFunction) {
  // Exclude auth-related routes from strict session validation to avoid loops
  const excludedPaths = [
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/reset",
    "/api/health",
    "/api/db-diagnostics"
  ];

  if (excludedPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  try {
    const supabaseServer = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return parseCookieHeader(req.headers.cookie ?? "").map(c => ({
            name: c.name,
            value: c.value ?? ""
          }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.append("Set-Cookie", serializeCookieHeader(name, value, {
              ...options,
              httpOnly: true,
              path: "/",
              sameSite: "lax"
            }));
          });
        }
      }
    });

    // Validates current jwt token relative to Supabase auth
    const { data: { user }, error } = await supabaseServer.auth.getUser();

    if (error || !user) {
      console.warn(`[Middleware] Unauthorized access attempt to: ${req.path}`);
      
      // If endpoint is API, return JSON 401 Unauthorized
      if (req.path.startsWith("/api/")) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "A valid session cookie is required to access this resource."
        });
      }

      // If page route, redirect to login page
      return res.redirect("/login");
    }

    // Attach user information to request context
    (req as any).user = user;
    (req as any).supabase = supabaseServer;

    next();
  } catch (err: any) {
    console.error("[Middleware] Exception processing session:", err.message || err);
    if (req.path.startsWith("/api/")) {
      return res.status(500).json({ error: "Internal Server Error in session middleware" });
    }
    next();
  }
}

/**
 * Standard Next/generic NextRequest, NextResponse adapter-style middleware for compatibility
 */
export async function middleware(request: { headers: Headers; url: string }) {
  const url = new URL(request.url);
  const isApiRoute = url.pathname.startsWith("/api");

  // Allow basic login / auth routes
  if (
    url.pathname.startsWith("/login") ||
    url.pathname.startsWith("/api/auth") ||
    url.pathname.startsWith("/api/health")
  ) {
    return { status: "allow" };
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  
  const supabaseServer = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(cookieHeader).map(c => ({
          name: c.name,
          value: c.value ?? ""
        }));
      },
      setAll() {}
    }
  });

  const { data: { user }, error } = await supabaseServer.auth.getUser();

  if (error || !user) {
    if (isApiRoute) {
      return { status: "unauthorized", code: 401 };
    }
    return { status: "redirect", destination: "/login" };
  }

  return { status: "allow", user };
}
