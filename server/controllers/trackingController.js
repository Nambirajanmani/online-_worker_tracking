const getTrackingSummary = async (req, res) => {
  res.json({
    success: true,
    data: {
      activeUsers: 0,
      screenshotsCaptured: 0,
      trackedSessions: 0
    }
  });
};

module.exports = { getTrackingSummary };
