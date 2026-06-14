/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Calculates the Jaro Distance between two strings.
 */
export function jaroDistance(s1: string, s2: string): number {
  const str1 = s1.trim().toLowerCase();
  const str2 = s2.trim().toLowerCase();

  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0 && len2 === 0) return 1.0;
  if (len1 === 0 || len2 === 0) return 0.0;

  // Max distance allowed for matching characters
  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
  const matchDist = Math.max(0, matchWindow);

  const matched1 = new Array(len1).fill(false);
  const matched2 = new Array(len2).fill(false);

  let matches = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDist);
    const end = Math.min(len2, i + matchDist + 1);

    for (let j = start; j < end; j++) {
      if (!matched2[j] && str1[i] === str2[j]) {
        matched1[i] = true;
        matched2[j] = true;
        matches++;
        break;
      }
    }
  }

  if (matches === 0) return 0.0;

  // Count transpositions
  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (matched1[i]) {
      while (!matched2[k]) {
        k++;
      }
      if (str1[i] !== str2[k]) {
        transpositions++;
      }
      k++;
    }
  }

  const t = transpositions / 2;

  return (matches / len1 + matches / len2 + (matches - t) / matches) / 3;
}

/**
 * Calculates the Jaro-Winkler Similarity between two strings.
 * Scale parameter p = 0.1 (standard)
 */
export function jaroWinkler(s1: string, s2: string): number {
  const jaro = jaroDistance(s1, s2);
  if (jaro < 0.7) return jaro; // Threshold usually applied

  const str1 = s1.trim().toLowerCase();
  const str2 = s2.trim().toLowerCase();

  // Find prefix length up to 4
  let prefixLen = 0;
  const maxPrefix = Math.min(4, Math.min(str1.length, str2.length));

  for (let i = 0; i < maxPrefix; i++) {
    if (str1[i] === str2[i]) {
      prefixLen++;
    } else {
      break;
    }
  }

  const p = 0.1;
  return jaro + prefixLen * p * (1 - jaro);
}

/**
 * Normalizes an address string for Cosine Similarity.
 * - lowercase
 * - remove punctuation
 * - remove extra spaces
 */
export function normalizeAddress(address: string): string {
  if (!address) return "";
  return address
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calculates the Cosine Similarity between two strings based on bag-of-words frequency.
 */
export function cosineSimilarity(addr1: string, addr2: string): number {
  const norm1 = normalizeAddress(addr1);
  const norm2 = normalizeAddress(addr2);

  if (!norm1 || !norm2) return 0.0;

  const words1 = norm1.split(" ").filter((w) => w.length > 0);
  const words2 = norm2.split(" ").filter((w) => w.length > 0);

  if (words1.length === 0 || words2.length === 0) return 0.0;

  // Create vocabulary from both word lists
  const vocab = new Set<string>([...words1, ...words2]);

  const freqMap1: Record<string, number> = {};
  const freqMap2: Record<string, number> = {};

  for (const word of words1) {
    freqMap1[word] = (freqMap1[word] || 0) + 1;
  }
  for (const word of words2) {
    freqMap2[word] = (freqMap2[word] || 0) + 1;
  }

  let dotProduct = 0;
  let mag1Sq = 0;
  let mag2Sq = 0;

  for (const word of vocab) {
    const val1 = freqMap1[word] || 0;
    const val2 = freqMap2[word] || 0;

    dotProduct += val1 * val2;
    mag1Sq += val1 * val1;
    mag2Sq += val2 * val2;
  }

  const mag1 = Math.sqrt(mag1Sq);
  const mag2 = Math.sqrt(mag2Sq);

  if (mag1 === 0 || mag2 === 0) return 0.0;

  return dotProduct / (mag1 * mag2);
}

/**
 * Checks if raw phone numbers match after stripping formatting.
 */
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function phoneMatchScore(p1: string, p2: string): number {
  const clean1 = cleanPhoneNumber(p1);
  const clean2 = cleanPhoneNumber(p2);
  if (!clean1 || !clean2) return 0;
  return clean1 === clean2 ? 100 : 0;
}

/**
 * Calculates combined duplicate score.
 * Formula: Duplicate Score = (Name Similarity × 40%) + (Phone Match × 40%) + (Address Similarity × 20%)
 */
export function calculateCombinedDuplicateScore(
  clientA: { firstName: string; middleName?: string; lastName: string; mobileNumber: string; address: string; facebookProfileLink?: string },
  clientB: { firstName: string; middleName?: string; lastName: string; mobileNumber: string; address: string; facebookProfileLink?: string }
): {
  score: number;
  nameSimilarity: number;
  phoneMatch: number;
  addressSimilarity: number;
  facebookMatch: boolean;
} {
  const fullNameA = `${clientA.firstName} ${clientA.middleName || ""} ${clientA.lastName}`.replace(/\s+/g, " ").trim();
  const fullNameB = `${clientB.firstName} ${clientB.middleName || ""} ${clientB.lastName}`.replace(/\s+/g, " ").trim();

  const nameSim = Math.round(jaroWinkler(fullNameA, fullNameB) * 100);
  const phoneScore = phoneMatchScore(clientA.mobileNumber, clientB.mobileNumber);
  const addrSim = Math.round(cosineSimilarity(clientA.address, clientB.address) * 100);

  // Check Layer 1 for direct facebook exact matches
  const fbA = clientA.facebookProfileLink?.trim().toLowerCase();
  const fbB = clientB.facebookProfileLink?.trim().toLowerCase();
  const facebookMatch = !!(fbA && fbB && fbA === fbB);

  // Exact matches on Phone Number or FB profile URL yields 100% Risk Score immediately (Layer 1)
  const isLayer1Exact = (phoneScore === 100) || facebookMatch;

  let score = Math.round(nameSim * 0.4 + phoneScore * 0.4 + addrSim * 0.2);

  if (isLayer1Exact) {
    score = 100; // Force maximum risk
  }

  return {
    score,
    nameSimilarity: nameSim,
    phoneMatch: phoneScore,
    addressSimilarity: addrSim,
    facebookMatch
  };
}
