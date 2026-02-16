import { getMemberNames } from "../db/postgres.js";

// Remove special characters but keep spaces, hyphens, apostrophes
function cleanInput(str) {
  return str.replace(/[^\w\s\-']/g, "").trim();
}

// Calculate Levenshtein distance (string similarity)
function levenshteinDistance(str1, str2) {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  const matrix = Array(s2.length + 1).fill(null).map(() => 
    Array(s1.length + 1).fill(null)
  );

  for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }

  return matrix[s2.length][s1.length];
}

// Capitalize first letter of each word
function capitalizeFirstLetter(str) {
  return str
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

// Main matching function
export async function matchParticipantName(input) {
  if (!input || input.trim() === "") return "";
  
  // Clean special characters first
  const cleaned = cleanInput(input);
  if (!cleaned) return capitalizeFirstLetter(input);
  
  const KNOWN_NAMES = await getMemberNames();
  const inputLower = cleaned.toLowerCase().trim();
  
  // 1. Exact match (case-insensitive)
  const exactMatch = KNOWN_NAMES.find(
    name => name.toLowerCase() === inputLower
  );
  if (exactMatch) return exactMatch;

  // 2. Starts-with match (e.g., "Stro" → "Strong")
  const startsWithMatch = KNOWN_NAMES.find(
    name => name.toLowerCase().startsWith(inputLower)
  );
  if (startsWithMatch) return startsWithMatch;

  // 3. Fuzzy match - find closest name
  let bestMatch = null;
  let bestDistance = Infinity;
  const MAX_DISTANCE = 3; // Only match if difference is ≤3 characters
  
  for (const knownName of KNOWN_NAMES) {
    const distance = levenshteinDistance(cleaned, knownName);
    
    if (distance < bestDistance && distance <= MAX_DISTANCE) {
      bestDistance = distance;
      bestMatch = knownName;
    }
  }

  // Return best match or capitalized input if no match found
  return bestMatch || capitalizeFirstLetter(cleaned);
}