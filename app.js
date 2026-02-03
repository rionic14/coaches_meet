require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

// [기능 1] 직책 찾기
app.get('/get-role', async (req, res) => {
    const name = req.query.name;
    try {
        const [rows] = await pool.execute('SELECT position_ko FROM list WHERE name = ?', [name]);
        const result = rows.length > 0 ? rows[0].position_ko : '미등록';
        res.json({ role: result });
    } catch (err) {
        res.status(500).json({ error: "DB 에러" });
    }
});

// [기능 2] 저장하기
app.post('/save-meeting', async (req, res) => {
    const { date, attendees } = req.body;
    try {
        const sql = `INSERT INTO coaches_meet (date, name, role, mention, log_num) 
                     VALUES ? 
                     ON DUPLICATE KEY UPDATE 
                     mention = VALUES(mention), 
                     role = VALUES(role),
                     log_num = VALUES(log_num)`;
        
        const values = attendees.map((a, index) => [date, a.name, a.role, a.mention, index + 1]);

        if (values.length > 0) {
            await pool.query(sql, [values]);
            res.json({ success: true, message: "저장 완료!" });
        } else {
            res.json({ success: false, message: "데이터 없음" });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// [기능 3] 회의록 본문 불러오기
app.get('/load-meeting', async (req, res) => {
    const date = req.query.date;
    try {
        const [rows] = await pool.execute(
            'SELECT name, role, mention FROM coaches_meet WHERE date = ? ORDER BY log_num ASC', 
            [date]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// [기능 4] daily.html 상단 요약용 스태프 리스트 (중복 제거 및 컬럼 수정)
app.get('/get-staff-summary', async (req, res) => {
    try {
        // position1 컬럼을 반드시 포함!
        const [rows] = await pool.execute(
            'SELECT name, position_ko, position1 FROM list WHERE (position1 BETWEEN 1 AND 30) ORDER BY position1 ASC'
        );
        console.log("📥 스탭 요약 데이터 전송함"); 
        res.json(rows);
    } catch (err) {
        console.error("❌ 요약 로드 에러:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => {
    console.log("-----------------------------------------");
    console.log("🚀 서버 가동 중: http://localhost:3000");
    console.log("-----------------------------------------");
});