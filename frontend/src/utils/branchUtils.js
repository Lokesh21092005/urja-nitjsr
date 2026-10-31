/**
 * Official Branch and Team Mapping Utilities for URJA-27 (Frontend)
 *
 * Enforces the fixed 8 original branches, canonical combined-team mappings
 * for girls' competitions, and attribution of match statistics/points without
 * duplication.
 */

export const OFFICIAL_BRANCHES = [
  "CSE",
  "ECE",
  "EE",
  "CE",
  "ME",
  "MME",
  "PIE+ECM",
  "PG",
];

/**
 * Normalize single branch name representations.
 * Handles variations such as "PIE + ECM", "(PIE+ECM)", and case differences.
 */
export function normalizeBranch(name) {
  if (!name || typeof name !== "string") return "";
  const cleaned = name.trim();

  if (/^\(?\s*PIE\s*\+\s*ECM\s*\)?$/i.test(cleaned)) {
    return "PIE+ECM";
  }

  const found = OFFICIAL_BRANCHES.find(
    (b) => b.toLowerCase() === cleaned.toLowerCase()
  );
  return found || "";
}

/**
 * Extract constituent original branches from a team name.
 *
 * Rules:
 * - Only records where gender is explicitly "Girls" (case-insensitive) are treated
 *   as girls' competitions. Records with missing, undefined, or other gender values
 *   are NEVER treated as girls' competitions and are not decomposed into combined branches.
 * - For girls' competitions:
 *   - Combined teams such as "ECE + EE", "EE + ECE", "CE + PIE + ECM", "(PIE+ECM) + ECE"
 *     are decomposed into their two constituent original branches.
 *   - Single branch teams (e.g. in Girls' Athletics) return [branch].
 *   - Handles arbitrary whitespace, parens, and reversed branch-name order.
 * - For boys' or non-girls competitions:
 *   - Teams are individual branches (e.g. "PIE+ECM" or "PIE + ECM" is one branch).
 *   - Never decomposes boys' teams into multiple branches.
 *
 * Returns an array of valid branches from OFFICIAL_BRANCHES (empty array if unknown).
 */
export function getConstituentBranches(teamName, gender = "") {
  if (!teamName || typeof teamName !== "string") return [];
  const trimmed = teamName.trim();
  if (!trimmed) return [];

  const isGirls = String(gender || "").trim().toLowerCase() === "girls";

  // For non-girls or missing-gender competitions, teams are single branches
  if (!isGirls) {
    const single = normalizeBranch(trimmed);
    return single ? [single] : [];
  }

  // Girls competition: check if it's already a single direct official branch (e.g. Athletics)
  const directBranch = normalizeBranch(trimmed);
  if (directBranch) {
    return [directBranch];
  }

  // Girls competition: check for combined team
  const matched = [];
  let remaining = trimmed;

  // 1. Check for PIE+ECM (with or without parens and whitespace)
  const pieEcmRegex = /\(?\s*PIE\s*\+\s*ECM\s*\)?/i;
  if (pieEcmRegex.test(remaining)) {
    matched.push("PIE+ECM");
    remaining = remaining.replace(pieEcmRegex, " ");
  }

  // 2. Check for the other 7 branches: order longer names first (ECE, CSE, MME before CE, ME, EE, PG)
  // to prevent accidental substring collisions (e.g. CE in ECE or ME in MME)
  const otherBranches = ["CSE", "ECE", "MME", "CE", "ME", "EE", "PG"];
  for (const branch of otherBranches) {
    const regex = new RegExp(`(^|[^A-Za-z])${branch}([^A-Za-z]|$)`, "i");
    if (regex.test(remaining)) {
      matched.push(branch);
      remaining = remaining.replace(regex, "$1 $2");
    }
  }

  // Filter only to valid official branches and deduplicate
  const unique = Array.from(new Set(matched)).filter((b) =>
    OFFICIAL_BRANCHES.includes(b)
  );

  return unique.sort();
}

/**
 * Returns a canonical representation for a team name.
 * e.g. "EE + ECE" -> "ECE + EE"
 */
export function getCanonicalTeamName(teamName, gender = "") {
  const constituents = getConstituentBranches(teamName, gender);
  if (constituents.length === 2) {
    return `${constituents[0]} + ${constituents[1]}`;
  }
  if (constituents.length === 1) {
    return constituents[0];
  }
  return String(teamName).trim();
}

/**
 * Attribute match statistics to constituent branches.
 *
 * Rules:
 * - A combined girls' team (e.g. "ECE + EE") represents one team for match scheduling and results.
 * - When attributing statistics (PLD, W, D, L, GD, GS, Pts) to constituent original branches:
 *   - Each constituent branch participated in that 1 match (PLD = stats.pld, typically 1).
 *   - The match is counted ONCE for each branch (never multiplied by number of branches).
 *   - Match outcome (W, D, L) and goal metrics (GD, GS) are attributed identically to each branch.
 *   - Points (Pts) are credited in full to both constituent original branches.
 * - The combined team itself is never added as a separate entry in branch standings.
 */
export function attributeMatchStats(teamName, rawStats = {}, gender = "") {
  const branches = getConstituentBranches(teamName, gender);
  if (!branches || branches.length === 0) return [];

  const pld = Number(rawStats.pld ?? rawStats.Pld ?? 0) || 0;
  const w = Number(rawStats.w ?? rawStats.W ?? 0) || 0;
  const d = Number(rawStats.d ?? rawStats.D ?? 0) || 0;
  const l = Number(rawStats.l ?? rawStats.L ?? 0) || 0;
  const gd = Number(rawStats.gd ?? rawStats.GD ?? 0) || 0;
  const gs = Number(rawStats.gs ?? rawStats.GS ?? 0) || 0;
  const pts =
    Number(
      rawStats.pts ?? rawStats.Pts ?? rawStats.points ?? rawStats.Points ?? 0
    ) || 0;

  return branches.map((branch) => ({
    branch,
    pld,
    w,
    d,
    l,
    gd,
    gs,
    pts,
  }));
}

/**
 * Calculate the branch standings from an array of Score documents.
 * Guarantees exactly 8 original branches are returned, correctly distributing
 * combined girls' team points and stats without duplicate counting.
 */
export function calculateBranchStandings(documents) {
  // Initialize all 8 official branches with 0
  const branchMap = {};
  for (const branch of OFFICIAL_BRANCHES) {
    branchMap[branch] = {
      name: branch,
      branch,
      breakdown: {},
      points: 0,
      totalPoints: 0,
      pld: 0,
      w: 0,
      d: 0,
      l: 0,
      gd: 0,
      gs: 0,
    };
  }

  if (!Array.isArray(documents)) {
    return Object.values(branchMap);
  }

  const awardTeam = (teamName, medalPoints, sport, gender) => {
    const awardGender = String(teamName || "").includes("+") ? "Girls" : gender;
    const constituents = getConstituentBranches(teamName, awardGender);

    const pointsPerBranch = constituents.length > 0 ? medalPoints / constituents.length : 0;

    for (const branch of constituents) {
      if (!branchMap[branch]) continue;
      branchMap[branch].points += pointsPerBranch;
      branchMap[branch].totalPoints += pointsPerBranch;
      branchMap[branch].breakdown[sport] =
        (branchMap[branch].breakdown[sport] || 0) + pointsPerBranch;
    }
  };

  for (const doc of documents) {
    const sport = String(doc?.sport || "").trim();
    const gender = String(doc?.gender || "").trim();

    if (["athletics", "yoga", "parade"].includes(sport.toLowerCase())) {
      const pointsTable = doc?.pointsTable;
      if (!pointsTable || !Array.isArray(pointsTable.headings) || !Array.isArray(pointsTable.data)) continue;

      const headings = pointsTable.headings.map((heading) => String(heading).trim().toLowerCase());
      const positionIdx = headings.indexOf("position");
      const teamIdx = headings.indexOf("team");
      const pointsIdx = headings.indexOf("points");
      if (positionIdx === -1 || teamIdx === -1) continue;

      const defaultPositionPoints = { 1: 5, 2: 3, 3: 2 };
      for (const row of pointsTable.data) {
        if (!Array.isArray(row)) continue;
        const position = Number.parseInt(row[positionIdx], 10);
        if (gender === "Girls" && position === 3) continue;

        const enteredPoints = pointsIdx === -1 ? NaN : Number(row[pointsIdx]);
        const points = Number.isFinite(enteredPoints) && enteredPoints >= 0
          ? enteredPoints
          : defaultPositionPoints[position];
        if (!Number.isFinite(points) || points <= 0) continue;
        awardTeam(String(row[teamIdx] || "").trim(), points, sport, gender);
      }
      continue;
    }

    if (String(doc?.stage || "").trim().toLowerCase() !== "knockout") continue;

    const rounds = Array.isArray(doc?.knockout?.rounds) ? doc.knockout.rounds : [];
    const finalRound = [...rounds].reverse().find((round) => /final/i.test(round?.name || "")) || rounds[rounds.length - 1];
    const finalMatches = Array.isArray(finalRound?.matches) ? finalRound.matches : [];
    const finalMatch = finalMatches[finalMatches.length - 1];

    if (finalMatch?.winner) {
      const winner = String(finalMatch.winner).trim();
      const winnerKey = getCanonicalTeamName(winner, "Girls");
      const team1Key = getCanonicalTeamName(finalMatch.team1, "Girls");
      const runnerUp = winnerKey === team1Key ? finalMatch.team2 : finalMatch.team1;
      awardTeam(winner, 10, sport, gender);
      awardTeam(String(runnerUp || "").trim(), 7, sport, gender);
    }

    const thirdPlace = String(doc?.knockout?.thirdPlace?.match?.winner || "").trim();
    if (gender !== "Girls" && thirdPlace) awardTeam(thirdPlace, 5, sport, gender);
  }

  const result = Object.values(branchMap);

  // Sort by total points descending, then branch name ascending
  result.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    return a.branch.localeCompare(b.branch);
  });

  return result.map((item, index) => ({
    ...item,
    position: index + 1,
  }));
}
