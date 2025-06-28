const fs = require('fs'); const path = require('path'); const filePath = path.join(__dirname, 'src/hooks/useAppLogic.ts'); const fileContent = fs.readFileSync(filePath, 'utf8');
