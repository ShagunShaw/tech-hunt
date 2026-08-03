export const POINTS = {
    initial: 25,
    levels: [
        { pass: 3, hint: -2 },      // S1
        { pass: 5, hint: -4 },      // S2
        { pass: 8, hint: -5 },      // S3
        { pass: 10, hint: -8 },     // S4
        { pass: 13, hint: -10 },    // S5
        { pass: 16, hint: -13 },    // S6
    ],
    max: 80             // can only be achieved when all stages are passed without using any hint at any stage
}

Give actual values to these themes
export const THEMES = ['Theme 1', 'Theme 2', 'Theme 3', 'Theme 4', 'Theme 5', 'Theme 6']

export const TECH_DOMAINS = {
    0: 'DSA',
    1: 'Web',
    2: 'AI/ML',
    3: 'Cybersecurity',
    4: 'Cloud&Devops',
    5: 'BlockChain'
}