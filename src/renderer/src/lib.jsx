/**
 * Normalizes/modifies a progress value
 * @param {number} progress Progress of the stream
 * @param {function} modifier Modifier function to mutate the progress
 * @returns Normalized or modified progress
 */

export function makeProgressValue(progress, modifier) {
  if (!progress || progress < 0) return 0;
  else {
    if (progress > 100) return 100;
    else return (modifier) ? modifier(progress) : progress;
  }
};

/**
 * Gets a format from a data object
 * @param {string} type "video" or "audio"
 * @param {string} id Format ID
 * @param {object} data Video data with a "formats" property
 * @returns The wanted format object
 */

export function getFormat(type, id, data) {
  if (data) {
    return data.formats[type].find((f) => f.id == id);
  } else return undefined;
};