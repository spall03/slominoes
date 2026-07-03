module.exports = ({ config }) => {
  const nextConfig = { ...config };

  if (process.env.EXPO_WEB_BASE_URL) {
    nextConfig.experiments = {
      ...(nextConfig.experiments ?? {}),
      baseUrl: process.env.EXPO_WEB_BASE_URL,
    };
  }

  return nextConfig;
};
