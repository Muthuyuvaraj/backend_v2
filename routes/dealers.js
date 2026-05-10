const express = require('express');
const router = express.Router();
const Dealer = require('../models/Dealer');

const getNextDealerId = async () => {
  const lastDealer = await Dealer.findOne().sort({ createdAt: -1 });

  if (!lastDealer) return 'A-101';

  const parts = String(lastDealer.dealerId).split('-');
  if (parts.length !== 2) {
    throw new Error('Invalid existing dealerId format; cannot auto-increment');
  }

  const [letter, numStr] = parts;
  if (letter.length !== 1 || letter < 'A' || letter > 'Z') {
    throw new Error('Invalid dealer letter prefix');
  }

  const number = parseInt(numStr, 10);
  if (Number.isNaN(number)) {
    throw new Error('Invalid dealer number suffix');
  }

  if (number < 999) {
    return `${letter}-${number + 1}`;
  }

  if (letter === 'Z') {
    throw new Error('Dealer ID pool exhausted (Z-999)');
  }

  const nextLetter = String.fromCharCode(letter.charCodeAt(0) + 1);
  return `${nextLetter}-101`;
};

// Create dealer (dealerId is generated — never taken from client)
router.post('/', async (req, res) => {
  try {
    const { name, phone, area, openingBalance } = req.body;

    if (!name || name.length > 50) {
      return res.status(400).json({ error: 'Invalid name' });
    }

    if (!phone || !/^\d{10}$/.test(String(phone))) {
      return res.status(400).json({ error: 'Invalid phone' });
    }

    if (area != null && area !== '' && String(area).length > 100) {
      return res.status(400).json({ error: 'Area too long' });
    }

    let ob = openingBalance;
    if (ob !== undefined && ob !== null) {
      ob = Number(ob);
      if (Number.isNaN(ob)) {
        return res.status(400).json({ error: 'Invalid openingBalance' });
      }
    } else {
      ob = undefined;
    }

    const dealerId = await getNextDealerId();

    const dealer = new Dealer({
      dealerId,
      name: String(name).trim(),
      phone: String(phone),
      area: area == null || area === '' ? undefined : String(area).trim(),
      openingBalance: ob,
    });

    const saved = await dealer.save();
    res.status(201).json(saved);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Dealer ID conflict; retry' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    if (
      err.message &&
      (err.message.includes('exhausted') ||
        err.message.includes('Invalid existing') ||
        err.message.includes('Invalid dealer'))
    ) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// Get all dealers
router.get('/', async (req, res) => {
  try {
    const dealers = await Dealer.find();
    res.json(dealers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Dealer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Dealer deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
