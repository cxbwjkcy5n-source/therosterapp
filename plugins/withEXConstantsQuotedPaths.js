const { withXcodeProject } = require('@expo/config-plugins');

/**
 * Finds the EXConstants "Constants.bundle" build script phase and ensures
 * all file path references are quoted, so the script works when the project
 * folder contains spaces (e.g. "therosterapp-prod 2").
 */
module.exports = function withEXConstantsQuotedPaths(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const shellScripts = project.pbxShellScriptBuildPhaseSection();

    Object.keys(shellScripts).forEach((key) => {
      if (key.endsWith('_comment')) return;
      const phase = shellScripts[key];
      if (!phase || !phase.shellScript) return;

      // Target the EXConstants copy-constants-resources script
      const script = phase.shellScript;
      if (
        typeof script === 'string' &&
        (script.includes('EXConstants') || script.includes('expo-constants')) &&
        script.includes('Constants.bundle')
      ) {
        // Ensure BUILT_PRODUCTS_DIR and UNLOCALIZED_RESOURCES_FOLDER_PATH are quoted
        phase.shellScript = script
          .replace(/\$BUILT_PRODUCTS_DIR(?!")/g, '"$BUILT_PRODUCTS_DIR"')
          .replace(/\$UNLOCALIZED_RESOURCES_FOLDER_PATH(?!")/g, '"$UNLOCALIZED_RESOURCES_FOLDER_PATH"')
          .replace(/\$SRCROOT(?!")/g, '"$SRCROOT"')
          .replace(/\$PROJECT_DIR(?!")/g, '"$PROJECT_DIR"');
      }
    });

    return config;
  });
};
