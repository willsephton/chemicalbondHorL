import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const app = express();
const port = 3000;

// __dirname workaround in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load bond data
const bondData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'bonds.json'), 'utf-8'));

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
  if (!req.session.score) {
    // Start a new game
    const [bond1, bond2] = getRandomBonds();
    req.session.bond1 = bond1;
    req.session.bond2 = bond2;
    req.session.score = 0;
  }
  res.render('index', {
    bond1: req.session.bond1,
    bond2: req.session.bond2,
    score: req.session.score
  });
});

// Handle guess
app.get('/guess/:choice', (req, res) => {
  const { choice } = req.params;
  const b1 = req.session.bond1;
  const b2 = req.session.bond2;

  const isCorrect = (choice === 'higher')
    ? b2.strength > b1.strength
    : b2.strength < b1.strength;

  if (isCorrect) {
    req.session.score++;
    // Shift bond2 to bond1, get a new bond2
    const [_, newBond2] = getRandomBonds(b2);
    req.session.bond1 = b2;
    req.session.bond2 = newBond2;
    res.redirect('/');
  } else {
    const finalScore = req.session.score;
    req.session.destroy(() => {
      res.render('result', { b1, b2, isCorrect: false, score: finalScore });
    });
  }
});

// Restart game manually
app.get('/restart', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.listen(port, () => {
  console.log(`Game running at http://localhost:${port}`);
});
