// The developer-facing view of the six phases: four steps (situation, spec, plan, implement).
const STEPS = {
  initial: [1, 'situation', null], analysis: [2, 'spec', null], planning: [3, 'plan', null],
  development: [4, 'implement', 'build'], testing: [4, 'implement', 'test'], deployment: [4, 'implement', 'ship'],
};
function stepOf(phase) { const s = STEPS[phase] || STEPS.analysis; return { number: s[0], name: s[1], detail: s[2] }; }
module.exports = { stepOf, STEPS };
