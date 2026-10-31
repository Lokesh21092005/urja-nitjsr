import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./LeaderBoard.css";
import { calculateBranchStandings } from "../../utils/branchUtils";
import Footer from "../Footer/Footer.jsx";

const API_URL = (
  import.meta.env.VITE_API_URL || "https://urja-nitjsr.onrender.com"
).replace(/\/$/, "");

const SCORES_API_URL = `${API_URL}/api/scores`;

/* -------------------------------------------------------
   Build overall branch leaderboard

   Every Group Stage points table contributes to the
   overall branch score.

   Rules:
   - Fixed official 8 original branches (CSE, ECE, EE, CE, ME, MME, PIE+ECM, PG).
   - Girls' combined teams (e.g. "ECE + EE") credit points to both constituent branches.
   - Combined teams never create a 9th/12th branch entry.
   - Exactly 8 branches are returned, sorted by points descending.
------------------------------------------------------- */
const buildBranchLeaderboard = (documents) => {
  return calculateBranchStandings(documents);
};

/* -------------------------------------------------------
   Position styling
------------------------------------------------------- */
const getPositionClass = (position) => {
  if (position === 1) return "first";
  if (position === 2) return "second";
  if (position === 3) return "third";

  return "normal";
};

/* -------------------------------------------------------
   Medal
------------------------------------------------------- */
// const getMedal = (position) => {
//   if (position === 1) return "🥇";
//   if (position === 2) return "🥈";
//   if (position === 3) return "🥉";

//   return position;
// };

/* -------------------------------------------------------
   Main Component
------------------------------------------------------- */
const LeaderBoard = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);

  /* -----------------------------------------------------
     Fetch backend data
  ----------------------------------------------------- */
  const fetchLeaderboardData = useCallback(
    async (manual = false) => {
      try {
        if (manual) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const token = localStorage.getItem("token");

        const response = await fetch(SCORES_API_URL, {
          method: "GET",
          cache: "no-cache",
          headers: {
            Accept: "application/json",
            ...(token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {}),
          },
        });

        if (!response.ok) {
          throw new Error(
            `Unable to fetch leaderboard (${response.status})`
          );
        }

        const result = await response.json();

        /*
          Normally backend returns:

          [
            {...},
            {...},
            {...}
          ]

          But this also safely handles:
          { data: [...] }
          { scores: [...] }
          {...}
        */
        let scoreDocuments = [];

        if (Array.isArray(result)) {
          scoreDocuments = result;
        } else if (Array.isArray(result?.data)) {
          scoreDocuments = result.data;
        } else if (Array.isArray(result?.scores)) {
          scoreDocuments = result.scores;
        } else if (
          result &&
          typeof result === "object"
        ) {
          scoreDocuments = [result];
        }

        setDocuments(scoreDocuments);
        setLastUpdated(new Date());
      } catch (err) {
        console.error(
          "Branch leaderboard error:",
          err
        );

        setError(
          err?.message ||
            "Unable to load leaderboard data."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  /* -----------------------------------------------------
     Initial fetch + auto refresh every 30 seconds
  ----------------------------------------------------- */
  useEffect(() => {
    fetchLeaderboardData();

    const interval = setInterval(() => {
      fetchLeaderboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchLeaderboardData]);

  /* -----------------------------------------------------
     Overall branch leaderboard
  ----------------------------------------------------- */
  const leaderboard = useMemo(() => {
    return buildBranchLeaderboard(documents);
  }, [documents]);

  /* -----------------------------------------------------
     Top 3
  ----------------------------------------------------- */
  const topThree = useMemo(() => {
    return leaderboard.slice(0, 3);
  }, [leaderboard]);

  const remainingBranches = useMemo(() => {
    return leaderboard.slice(3);
  }, [leaderboard]);

  const selectedBranchData = useMemo(() => {
    return leaderboard.find((branch) => branch.branch === selectedBranch) || null;
  }, [leaderboard, selectedBranch]);

  /* -----------------------------------------------------
     Total points
  ----------------------------------------------------- */
  const totalPoints = useMemo(() => {
    return leaderboard.reduce(
      (total, branch) => total + branch.points,
      0
    );
  }, [leaderboard]);

  /* -----------------------------------------------------
     Loading
  ----------------------------------------------------- */
  if (loading) {
    return (
      <div className="leaderboard-page">
        <div className="leaderboard-loading">
          <div className="loading-spinner"></div>

          <h2>LOADING LEADERBOARD</h2>

          <p>
            Fetching latest URJA&apos;27 scores...
          </p>
        </div>
      </div>
    );
  }

  /* -----------------------------------------------------
     Error
  ----------------------------------------------------- */
  if (error && leaderboard.length === 0) {
    return (
      <div className="leaderboard-page">
        <div className="leaderboard-error">
          <div className="error-icon">⚠️</div>

          <h2>LEADERBOARD UNAVAILABLE</h2>

          <p>{error}</p>

          <button
            className="refresh-button"
            onClick={() =>
              fetchLeaderboardData(true)
            }
          >
            ↻ TRY AGAIN
          </button>
        </div>
      </div>
    );
  }

  /* -----------------------------------------------------
     MAIN UI
  ----------------------------------------------------- */
  return (
    <div className="leaderboard-page">

      {/* Background */}
      <div className="leaderboard-grid"></div>

      <div className="pink-glow glow-one"></div>
      <div className="pink-glow glow-two"></div>

      {/* =================================================
          HEADER
      ================================================= */}
      <section className="leaderboard-header">

        <div className="header-content">

          <div className="header-small">
            URJA&apos;27 • NIT JAMSHEDPUR
          </div>

          <h1>
            BRANCH
            <span>LEADERBOARD</span>
          </h1>

          <p>
            INTER-BRANCH SPORTS CHAMPIONSHIP
          </p>

          <div className="live-indicator">
            <span className="live-dot"></span>
            LIVE SCOREBOARD
          </div>

        </div>

      </section>

      {/* =================================================
          SMALL STATS
      ================================================= */}
      <section className="leaderboard-stats">

        {/* Branches */}
        <div className="stat-card">

          <div className="stat-icon">
            🏫
          </div>

          <div className="stat-content">

            <span className="stat-label">
              BRANCHES
            </span>

            <strong>
              {leaderboard.length}
            </strong>

          </div>

        </div>

        {/* Total points */}
        <div className="stat-card">

          <div className="stat-icon">
            🏆
          </div>

          <div className="stat-content">

            <span className="stat-label">
              TOTAL POINTS
            </span>

            <strong>
              {totalPoints}
            </strong>

          </div>

        </div>

        {/* Leader */}
        <div className="stat-card">

          <div className="stat-icon">
            👑
          </div>

          <div className="stat-content">

            <span className="stat-label">
              CURRENT LEADER
            </span>

            <strong className="leader-name">
              {leaderboard[0]?.branch || "--"}
            </strong>

          </div>

        </div>

        {/* Status */}
        <div className="stat-card">

          <div className="stat-icon">
            🔴
          </div>

          <div className="stat-content">

            <span className="stat-label">
              STATUS
            </span>

            <strong className="status-live">
              LIVE
            </strong>

          </div>

        </div>

      </section>

      {/* =================================================
          REFRESH BAR
      ================================================= */}
      <section className="leaderboard-toolbar">

        <div className="update-info">

          <span className="update-dot"></span>

          {lastUpdated
            ? `Updated ${lastUpdated.toLocaleTimeString()}`
            : "Live data"}

        </div>

        <button
          className={`refresh-button ${
            refreshing ? "refreshing" : ""
          }`}
          onClick={() =>
            fetchLeaderboardData(true)
          }
          disabled={refreshing}
        >
          <span>↻</span>

          {refreshing
            ? "REFRESHING..."
            : "REFRESH"}

        </button>

      </section>

      {/* =================================================
          TOP 3
      ================================================= */}
      {topThree.length > 0 && (
        <section className="podium-section">

          <div className="section-heading">

            <span className="heading-line"></span>

            <h2>TOP 3 BRANCHES</h2>

            <span className="heading-line"></span>

          </div>

          <div className="podium">

            {/* -------------------------------------------
                2ND
            ------------------------------------------- */}
            {topThree[1] && (
              <div className="podium-wrapper second-wrapper">

                <div
                  className="podium-card second"
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${topThree[1].branch} points breakdown`}
                  onClick={() => setSelectedBranch(topThree[1].branch)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedBranch(topThree[1].branch);
                    }
                  }}
                >

                  <div className="podium-medal">
                    🥈
                  </div>

                  <div className="podium-rank">
                    2ND
                  </div>

                  <h3>
                    {topThree[1].branch}
                  </h3>

                  <div className="podium-points">
                    {topThree[1].points}
                    <span>PTS</span>
                  </div>

                  <div className="podium-base">
                    02
                  </div>

                </div>

              </div>
            )}

            {/* -------------------------------------------
                1ST
            ------------------------------------------- */}
            {topThree[0] && (
              <div className="podium-wrapper first-wrapper">

                <div
                  className="podium-card first"
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${topThree[0].branch} points breakdown`}
                  onClick={() => setSelectedBranch(topThree[0].branch)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedBranch(topThree[0].branch);
                    }
                  }}
                >

                  <div className="champion-tag">
                    CURRENT LEADER
                  </div>

                  <div className="podium-medal">
                    🥇
                  </div>

                  <div className="podium-rank">
                    1ST
                  </div>

                  <h3>
                    {topThree[0].branch}
                  </h3>

                  <div className="podium-points">
                    {topThree[0].points}
                    <span>PTS</span>
                  </div>

                  <div className="podium-base">
                    01
                  </div>

                </div>

              </div>
            )}

            {/* -------------------------------------------
                3RD
            ------------------------------------------- */}
            {topThree[2] && (
              <div className="podium-wrapper third-wrapper">

                <div
                  className="podium-card third"
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${topThree[2].branch} points breakdown`}
                  onClick={() => setSelectedBranch(topThree[2].branch)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedBranch(topThree[2].branch);
                    }
                  }}
                >

                  <div className="podium-medal">
                    🥉
                  </div>

                  <div className="podium-rank">
                    3RD
                  </div>

                  <h3>
                    {topThree[2].branch}
                  </h3>

                  <div className="podium-points">
                    {topThree[2].points}
                    <span>PTS</span>
                  </div>

                  <div className="podium-base">
                    03
                  </div>

                </div>

              </div>
            )}

          </div>

        </section>
      )}

      {/* =================================================
          COMPLETE BRANCH RANKING
      ================================================= */}
      <section className="standings-section">

        <div className="section-heading">

          <span className="heading-line"></span>

          <h2>BRANCH RANKING</h2>

          <span className="heading-line"></span>

        </div>

        {remainingBranches.length > 0 ? (

          <div className="standings-table-wrapper">

            <table className="standings-table">

              <thead>

                <tr>
                  <th>POSITION</th>
                  <th>BRANCH</th>
                  <th>POINTS</th>
                </tr>

              </thead>

              <tbody>

                {remainingBranches.map((branch, index) => (

                  <tr
                    key={branch.branch}
                    className={`${getPositionClass(index + 4)} branch-breakdown-row`}
                    role="button"
                    tabIndex={0}
                    aria-label={`View ${branch.branch} points breakdown`}
                    onClick={() => setSelectedBranch(branch.branch)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedBranch(branch.branch);
                      }
                    }}
                  >

                    {/* Position */}
                    <td>

                      <span className="position-number">

                        {index + 4}

                      </span>

                    </td>

                    {/* Branch */}
                    <td>

                      <div className="branch-name">
                        {branch.branch}
                      </div>

                    </td>

                    {/* Points */}
                    <td>

                      <span className="points-value">
                        {branch.points}
                      </span>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        ) : (

          <div className="leaderboard-empty">

            <div className="empty-icon">
              🏆
            </div>

            <h3>
              NO POINTS YET
            </h3>

            <p>
              Branch standings will appear once
              sports scores are updated.
            </p>

          </div>

        )}

        {selectedBranchData && (
          <div className="branch-breakdown-panel" aria-live="polite">
            <div className="branch-breakdown-heading">
              <h3>{selectedBranchData.branch} POINT BREAKDOWN</h3>
              <button type="button" aria-label="Close points breakdown" onClick={() => setSelectedBranch(null)}>×</button>
            </div>
            <div className="branch-breakdown-list">
              {Object.entries(selectedBranchData.breakdown || {}).map(([sport, points]) => (
                <div className="branch-breakdown-item" key={sport}><span>{sport}</span><strong>{points} pts</strong></div>
              ))}
              <div className="branch-breakdown-total"><span>Total</span><strong>{selectedBranchData.points} pts</strong></div>
            </div>
          </div>
        )}

      </section>

      {/* =================================================
          FOOTER
      ================================================= */}
      <Footer />

    </div>
  );
};

export default LeaderBoard;