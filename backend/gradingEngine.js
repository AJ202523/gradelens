const natural = require('natural');
const levenshtein = require('fast-levenshtein');

function normalize(text) {
    if (!text) return '';
    return String(text).toLowerCase().replace(/[^\w\s]|_/g, '').replace(/\s+/g, ' ').trim();
}

function tokenize(text) {
    const norm = normalize(text);
    return norm ? norm.split(' ') : [];
}

function areStringsMatching(str1, str2) {
    const norm1 = normalize(str1);
    const norm2 = normalize(str2);
    if (!norm1 && !norm2) return true;
    if (!norm1 || !norm2) return false;
    
    // Tier 1 Exact Match (normalized)
    if (norm1 === norm2) return true;
    
    // Typo tolerance
    if (levenshtein.get(norm1, norm2) <= 2) return true;
    
    // Stemming
    const stem1 = tokenize(str1).map(w => natural.PorterStemmer.stem(w)).join(' ');
    const stem2 = tokenize(str2).map(w => natural.PorterStemmer.stem(w)).join(' ');
    if (stem1 === stem2) return true;
    
    return false;
}

function containsKeyword(submission, keyword) {
    const normSub = normalize(submission);
    const normKey = normalize(keyword);
    if (!normSub || !normKey) return false;

    // Basic substring match on normalized text
    if (normSub.includes(normKey)) return true;

    // Stemmed inclusion check
    const stemSub = tokenize(submission).map(w => natural.PorterStemmer.stem(w)).join(' ');
    const stemKey = tokenize(keyword).map(w => natural.PorterStemmer.stem(w)).join(' ');
    if (stemSub.includes(stemKey)) return true;

    // N-gram typo tolerance check (Levenshtein distance)
    const subWords = tokenize(submission);
    const keyWords = tokenize(keyword);
    
    // Determine dynamic typo tolerance based on keyword length
    let threshold = 0;
    if (normKey.length > 5) threshold = 2;
    else if (normKey.length > 3) threshold = 1;
    
    if (keyWords.length > 0 && keyWords.length <= subWords.length) {
        for (let i = 0; i <= subWords.length - keyWords.length; i++) {
            const ngram = subWords.slice(i, i + keyWords.length).join(' ');
            if (levenshtein.get(ngram, normKey) <= threshold) {
                return true;
            }
        }
    }
    
    return false;
}

function gradeSubmission(answerKey, criticalKeywords, regularKeywords, studentText) {
    const wordCount = tokenize(studentText).length;
    
    const missedCritical = Array.isArray(criticalKeywords) ? criticalKeywords.filter(kw => !containsKeyword(studentText, kw)) : [];
    const missedRegular = Array.isArray(regularKeywords) ? regularKeywords.filter(kw => !containsKeyword(studentText, kw)) : [];
    const missedKeywords = [...missedCritical, ...missedRegular];

    // Tier 1 (100%)
    if (answerKey && areStringsMatching(studentText, answerKey)) {
        return {
            score: 100,
            log: "Tier 1 Triggered: Normalized submission exactly matches normalized Answer Key.",
            manualReviewFlag: false,
            missedKeywords: []
        };
    }
    
    // Tier 2 (50%)
    if (Array.isArray(criticalKeywords) && criticalKeywords.length > 0) {
        const hasAllCritical = criticalKeywords.every(kw => containsKeyword(studentText, kw));
        if (hasAllCritical) {
            return {
                score: 50,
                log: "Tier 2 Triggered: Submission contains ALL critical keywords.",
                manualReviewFlag: false,
                missedKeywords
            };
        }
    }
    
    // Tier 3 (25%)
    if (Array.isArray(regularKeywords) && regularKeywords.length > 0) {
        const hasAnyRegular = regularKeywords.some(kw => containsKeyword(studentText, kw));
        if (hasAnyRegular) {
            return {
                score: 25,
                log: "Tier 3 Triggered: Submission contains at least one regular keyword.",
                manualReviewFlag: wordCount > 50,
                missedKeywords
            };
        }
    }
    
    // Tier 4 (0%)
    return {
        score: 0,
        log: "Tier 4 Triggered: None of the above criteria were met.",
        manualReviewFlag: wordCount > 50,
        missedKeywords
    };
}

module.exports = {
    gradeSubmission,
    normalize,
    tokenize,
    areStringsMatching,
    containsKeyword
};
