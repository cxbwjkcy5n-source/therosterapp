const { withXcodeProject } = require('@expo/config-plugins');

/**
 * Sets ENABLE_USER_SCRIPT_SANDBOXING = NO on all targets in the Xcode project.
 * This is required for build scripts (e.g. EXConstants, OneSignal) to access
 * the filesystem when the project folder contains spaces or when sandboxing
 * blocks script phases.
 */
module.exports = function withUserScriptSandboxing(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const targets = project.pbxNativeTargetSection();

    Object.keys(targets).forEach((key) => {
      if (key.endsWith('_comment')) return;
      const target = targets[key];
      if (!target || !target.name) return;

      // Apply to all build configurations for this target
      const configList = project.pbxXCConfigurationList();
      const buildConfigListKey = target.buildConfigurationList;
      if (!buildConfigListKey) return;

      const buildConfigList = configList[buildConfigListKey];
      if (!buildConfigList || !buildConfigList.buildConfigurations) return;

      buildConfigList.buildConfigurations.forEach((configRef) => {
        const configKey = configRef.value;
        const buildConfig = project.pbxXCBuildConfigurationSection()[configKey];
        if (buildConfig && buildConfig.buildSettings) {
          buildConfig.buildSettings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO';
        }
      });
    });

    return config;
  });
};
