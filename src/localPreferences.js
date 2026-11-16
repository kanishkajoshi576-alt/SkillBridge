export function readLocalPreference(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.error(`SkillBridge could not read the "${key}" preference.`, error);
    return null;
  }
}

export function writeLocalPreference(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.error(`SkillBridge could not save the "${key}" preference.`, error);
  }
}
