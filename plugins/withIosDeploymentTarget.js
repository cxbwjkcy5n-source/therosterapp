/**
 * Sets IPHONEOS_DEPLOYMENT_TARGET in the Xcode project (pbxproj) for every
 * build configuration of every target.  This approach avoids any Podfile
 * post_install block entirely, so it cannot conflict with the one that
 * React Native / Expo already generates.
 */
const { withXcodeProject } = require('@expo/config-plugins');

const DEPLOYMENT_TARGET = '16.0';

const withIosDeploymentTarget = (config) => {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;

    // pbxproj stores build settings in XCBuildConfiguration sections.
    // Iterate every build configuration and set the deployment target.
    const configurations = project.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(configurations)) {
      // Skip comment entries (they are plain strings, not objects)
      if (typeof configurations[key] !== 'object') continue;

      const buildSettings = configurations[key].buildSettings;
      if (!buildSettings) continue;

      buildSettings.IPHONEOS_DEPLOYMENT_TARGET = DEPLOYMENT_TARGET;
    }

    return cfg;
  });
};

module.exports = withIosDeploymentTarget;
