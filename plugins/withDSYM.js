const { withXcodeProject } = require('@expo/config-plugins');

/**
 * Ensures Release builds generate dSYM files for all targets.
 * Fixes "Missing dSYM" warnings when uploading to App Store Connect / TestFlight.
 */
module.exports = function withDSYM(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const configurations = project.pbxXCBuildConfigurationSection();

    for (const key of Object.keys(configurations)) {
      if (typeof configurations[key] !== 'object') continue;
      const buildSettings = configurations[key].buildSettings;
      if (!buildSettings) continue;

      // Only set on Release configurations
      const name = configurations[key].name;
      if (name === 'Release') {
        buildSettings.DEBUG_INFORMATION_FORMAT = 'dwarf-with-dsym';
      }
    }

    return cfg;
  });
};
