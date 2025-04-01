const fs = require('fs');

function kiểm_tra_từ_tồn_tại(cụm_từ) {
    const từ_vựng = fs.readFileSync('TuVung.txt', 'utf8').split('\n');
    return từ_vựng.includes(cụm_từ);
}

module.exports = kiểm_tra_từ_tồn_tại;