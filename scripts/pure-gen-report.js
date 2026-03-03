const fs = require('fs');
const path = require('path');

const volumes = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/volumes.json'), 'utf8'));
const splits = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/split_type.json'), 'utf8'));

function distribute(weeklySets, structure) {
    const trainingDays = structure.filter(d => !d.rest);
    const sessions = structure.map(d => ({ day: d.day, rest: d.rest, exercises: [] }));

    for (const [muscle, totalSets] of Object.entries(weeklySets)) {
        if (typeof totalSets !== 'number' || totalSets <= 0) continue;
        const setsPerDay = Math.floor(totalSets / trainingDays.length);
        const remainder = totalSets % trainingDays.length;
        trainingDays.forEach((day, i) => {
            const session = sessions.find(s => s.day === day.day);
            if (session) {
                let sDay = setsPerDay + (i < remainder ? 1 : 0);
                if (sDay > 0) session.exercises.push({ muscle, sets: sDay });
            }
        });
    }
    return sessions;
}

const scenarios = [
    { days: 1, name: "1-Day Minimalist" },
    { days: 2, name: "2-Day Weekend Warrior" },
    { days: 3, name: "3-Day Standard" },
    { days: 5, name: "5-Day Serious" }
];

scenarios.forEach(sc => {
    console.log(`\nSCENARIO: ${sc.name}`);
    const profile = volumes.find(v => v.goal === 'HYPERTROPHY' && v.experienceLevel === 'INTERMEDIATE');
    const split = splits.find(s => s.daysPerWeek === sc.days);
    if (!profile || !split) return;

    const sessions = distribute(profile.weeklySets, split.structure);
    for (let w = 1; w <= 2; w++) {
        console.log(`WEEK ${w}`);
        sessions.forEach(s => {
            if (s.rest) return;
            console.log(` Day ${s.day}: ${s.exercises.map(e => `${e.muscle} (${e.sets}s)`).join(', ')}`);
        });
    }
});
