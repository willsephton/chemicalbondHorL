import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const app = express();
const port = process.env.PORT || 3000;

// __dirname workaround in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load bond data
const bondData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'bonds_large.json'), 'utf-8'));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Session setup
app.use(session({
  secret: 'chem-secret-key',
  resave: false,
  saveUninitialized: true
}));

// Helper: Get two different random bonds
function getRandomBonds(exclude = null) {
  let first = exclude || bondData[Math.floor(Math.random() * bondData.length)];
  let second;
  do {
    second = bondData[Math.floor(Math.random() * bondData.length)];
  } while (second.name === first.name);
  return [first, second];
}

// Start or continue the game
app.get('/', (req, res) => {
  if (!req.session.score && req.session.score !== 0) {
    // Start a new game
    const [bond1, bond2] = getRandomBonds();
    req.session.bond1 = bond1;
    req.session.bond2 = bond2;
    req.session.score = 0;
    req.session.lives = 3;  // <-- Add lives here
  }
  res.render('index', {
    bond1: req.session.bond1,
    bond2: req.session.bond2,
    score: req.session.score,
    lives: req.session.lives  // pass lives to the template
  });
});

// Handle guess
app.get('/guess/:choice', (req, res) => {
  const { choice } = req.params; // 'bond1' or 'bond2'
  const b1 = req.session.bond1;
  const b2 = req.session.bond2;

  // Determine which bond is stronger
  const strongerBond = (b1.strength > b2.strength) ? 'bond1' : 'bond2';

  const isCorrect = (choice === strongerBond);

  if (isCorrect) {
    req.session.score++;
    // Shift bond2 to bond1, get a new bond2
    const [_, newBond2] = getRandomBonds(b2);
    req.session.bond1 = b2;
    req.session.bond2 = newBond2;
    res.redirect('/');
  } else {
    req.session.lives--;
    if (req.session.lives > 0) {
      // Continue game but with fewer lives
      res.redirect('/');
    } else {
      // Game over
      const finalScore = req.session.score;
      req.session.destroy(() => {
        res.render('result', { b1, b2, isCorrect: false, score: finalScore });
      });
    }
  }
});



// Restart game manually
app.get('/restart', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Listen on all interfaces (0.0.0.0)
app.listen(port, '0.0.0.0', () => {
  console.log(`Game running at http://35.214.127.232:${port}/`);
});
