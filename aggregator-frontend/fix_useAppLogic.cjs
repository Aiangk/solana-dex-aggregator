const fs = require('fs'); const path = require('path'); const filePath = path.join(process.cwd(), 'src/hooks/useAppLogic.ts'); let content = fs.readFileSync(filePath, 'utf8');
// 创建正则表达式来匹配有问题的部分
const pattern = /const poolKeysList = \[([\s\S]*?)\]\.map\(\(poolInfo\) => jsonInfo2PoolKeys\(poolInfo\)\);/;
const replacement = "const poolKeysList = [$1].map((poolInfo) => {\n          try {\n            return jsonInfo2PoolKeys(poolInfo);\n          } catch (error) {\n            console.warn(`跳过无效池子信息: ${poolInfo.id || \"未知ID\"}`);\n            return null;\n          }\n        }).filter(Boolean); // 过滤掉无效的池子信息";
// 执行替换并写回文件
const fixedContent = content.replace(pattern, replacement);
fs.writeFileSync(filePath, fixedContent, 'utf8'); console.log('文件已成功修复！');
