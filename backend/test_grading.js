const { gradeSubmission } = require('./gradingEngine');

const answerKey = "Node.js is a runtime environment";
const criticalKeywords = ["runtime", "environment"];
const regularKeywords = ["javascript", "js"];

console.log("Test Tier 1 (100% Exact match with typo):", 
    gradeSubmission(answerKey, criticalKeywords, regularKeywords, "node.js is a runtim environmen"));

console.log("Test Tier 2 (50% All critical):", 
    gradeSubmission(answerKey, criticalKeywords, regularKeywords, "it provides a runtime environment for apps"));

console.log("Test Tier 3 (25% Any regular):", 
    gradeSubmission(answerKey, criticalKeywords, regularKeywords, "it uses javascript"));

console.log("Test Tier 4 (0% None):", 
    gradeSubmission(answerKey, criticalKeywords, regularKeywords, "it is a backend server thing"));

const longText = new Array(51).fill("word").join(" ");
console.log("Test Manual Review Flag (0% with > 50 words):", 
    gradeSubmission(answerKey, criticalKeywords, regularKeywords, longText));
