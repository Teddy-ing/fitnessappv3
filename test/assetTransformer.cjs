// Keep image imports distinct in tests so incorrect exercise/asset mappings are detectable.
const path = require('node:path');
module.exports = {
    process(_source, filename) {
        return { code: `module.exports = ${JSON.stringify({ uri: path.basename(filename) })};` };
    },
};
