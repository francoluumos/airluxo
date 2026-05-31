// Curated spec library for common luxury / performance models.
// Gearbox + fuel values are kept compatible with the "List a car" dropdowns
// (gearbox: Auto | PDK | DCT | Manual · fuel: Petrol | Diesel | Mild hybrid |
// Plug-in hybrid | Electric | Hydrogen). Figures are approximate current-gen
// specs — partners can always override. Add rows freely; lookup is fuzzy.

const DB = [
  // Porsche
  { make: 'Porsche', model: '911 Turbo S', power: 650, seats: 4, accel: 2.7, gearbox: 'PDK', fuel: 'Petrol', drivetrain: 'AWD', category: 'Sport' },
  { make: 'Porsche', model: '911 Turbo', power: 572, seats: 4, accel: 2.8, gearbox: 'PDK', fuel: 'Petrol', drivetrain: 'AWD', category: 'Sport' },
  { make: 'Porsche', model: '911 Carrera 4 GTS', power: 480, seats: 4, accel: 3.3, gearbox: 'PDK', fuel: 'Petrol', drivetrain: 'AWD', category: 'Sport' },
  { make: 'Porsche', model: '911 Carrera S', power: 473, seats: 4, accel: 3.5, gearbox: 'PDK', fuel: 'Petrol', drivetrain: 'RWD', category: 'Sport' },
  { make: 'Porsche', model: '911 Carrera', power: 394, seats: 4, accel: 4.1, gearbox: 'PDK', fuel: 'Petrol', drivetrain: 'RWD', category: 'Sport' },
  { make: 'Porsche', model: '911 GT3', power: 510, seats: 2, accel: 3.4, gearbox: 'PDK', fuel: 'Petrol', drivetrain: 'RWD', category: 'Sport' },
  { make: 'Porsche', model: '718 Cayman', power: 300, seats: 2, accel: 4.9, gearbox: 'PDK', fuel: 'Petrol', drivetrain: 'RWD', category: 'Sport' },
  { make: 'Porsche', model: '718 Boxster', power: 300, seats: 2, accel: 4.9, gearbox: 'PDK', fuel: 'Petrol', drivetrain: 'RWD', category: 'Sport' },
  { make: 'Porsche', model: 'Taycan Turbo S', power: 761, seats: 4, accel: 2.8, gearbox: 'Auto', fuel: 'Electric', drivetrain: 'AWD', category: 'GT' },
  { make: 'Porsche', model: 'Taycan', power: 408, seats: 4, accel: 5.1, gearbox: 'Auto', fuel: 'Electric', drivetrain: 'RWD', category: 'GT' },
  { make: 'Porsche', model: 'Panamera', power: 348, seats: 4, accel: 5.3, gearbox: 'PDK', fuel: 'Petrol', drivetrain: 'RWD', category: 'GT' },
  { make: 'Porsche', model: 'Cayenne', power: 348, seats: 5, accel: 5.9, gearbox: 'Auto', fuel: 'Petrol', drivetrain: 'AWD', category: 'SUV' },
  { make: 'Porsche', model: 'Macan', power: 261, seats: 5, accel: 6.2, gearbox: 'PDK', fuel: 'Petrol', drivetrain: 'AWD', category: 'SUV' },

  // Lamborghini
  { make: 'Lamborghini', model: 'Huracán EVO', power: 631, seats: 2, accel: 2.9, gearbox: 'DCT', fuel: 'Petrol', drivetrain: 'AWD', category: 'Exotic' },
  { make: 'Lamborghini', model: 'Huracán Tecnica', power: 631, seats: 2, accel: 3.2, gearbox: 'DCT', fuel: 'Petrol', drivetrain: 'RWD', category: 'Exotic' },
  { make: 'Lamborghini', model: 'Huracán', power: 610, seats: 2, accel: 3.2, gearbox: 'DCT', fuel: 'Petrol', drivetrain: 'AWD', category: 'Exotic' },
  { make: 'Lamborghini', model: 'Urus', power: 657, seats: 5, accel: 3.6, gearbox: 'Auto', fuel: 'Petrol', drivetrain: 'AWD', category: 'SUV' },
  { make: 'Lamborghini', model: 'Revuelto', power: 1001, seats: 2, accel: 2.5, gearbox: 'DCT', fuel: 'Plug-in hybrid', drivetrain: 'AWD', category: 'Exotic' },
  { make: 'Lamborghini', model: 'Aventador', power: 769, seats: 2, accel: 2.8, gearbox: 'Auto', fuel: 'Petrol', drivetrain: 'AWD', category: 'Exotic' },

  // Ferrari
  { make: 'Ferrari', model: 'Roma', power: 612, seats: 4, accel: 3.4, gearbox: 'DCT', fuel: 'Petrol', drivetrain: 'RWD', category: 'GT' },
  { make: 'Ferrari', model: '296 GTB', power: 819, seats: 2, accel: 2.9, gearbox: 'DCT', fuel: 'Plug-in hybrid', drivetrain: 'RWD', category: 'Exotic' },
  { make: 'Ferrari', model: 'SF90 Stradale', power: 986, seats: 2, accel: 2.5, gearbox: 'DCT', fuel: 'Plug-in hybrid', drivetrain: 'AWD', category: 'Exotic' },
  { make: 'Ferrari', model: 'F8 Tributo', power: 710, seats: 2, accel: 2.9, gearbox: 'DCT', fuel: 'Petrol', drivetrain: 'RWD', category: 'Exotic' },
  { make: 'Ferrari', model: 'Purosangue', power: 715, seats: 4, accel: 3.3, gearbox: 'DCT', fuel: 'Petrol', drivetrain: 'AWD', category: 'SUV' },
  { make: 'Ferrari', model: 'Portofino', power: 612, seats: 4, accel: 3.5, gearbox: 'DCT', fuel: 'Petrol', drivetrain: 'RWD', category: 'GT' },

  // Mercedes-AMG
  { make: 'Mercedes-AMG', model: 'GT 63 S', power: 630, seats: 4, accel: 3.2, gearbox: 'Auto', fuel: 'Petrol', drivetrain: 'AWD', category: 'GT' },
  { make: 'Mercedes-AMG', model: 'GT 63', power: 577, seats: 4, accel: 3.2, gearbox: 'Auto', fuel: 'Petrol', drivetrain: 'AWD', category: 'GT' },
  { make: 'Mercedes-AMG', model: 'G 63', power: 577, seats: 5, accel: 4.5, gearbox: 'Auto', fuel: 'Petrol', drivetrain: 'AWD', category: 'SUV' },
  { make: 'Mercedes-AMG', model: 'C 63', power: 671, seats: 5, accel: 3.4, gearbox: 'Auto', fuel: 'Plug-in hybrid', drivetrain: 'AWD', category: 'Sport' },
  { make: 'Mercedes-AMG', model: 'E 63 S', power: 612, seats: 5, accel: 3.4, gearbox: 'Auto', fuel: 'Petrol', drivetrain: 'AWD', category: 'Sport' },
  { make: 'Mercedes-AMG', model: 'SL 63', power: 577, seats: 4, accel: 3.6, gearbox: 'Auto', fuel: 'Petrol', drivetrain: 'AWD', category: 'GT' },

  // Mercedes-Benz
  { make: 'Mercedes-Benz', model: 'S 500', power: 429, seats: 5, accel: 4.9, gearbox: 'Auto', fuel: 'Mild hybrid', drivetrain: 'AWD', category: 'GT' },
  { make: 'Mercedes-Benz', model: 'EQS', power: 516, seats: 5, accel: 4.3, gearbox: 'Auto', fuel: 'Electric', drivetrain: 'AWD', category: 'GT' },
  { make: 'Mercedes-Benz', model: 'V-Class', power: 237, seats: 7, accel: 8.0, gearbox: 'Auto', fuel: 'Diesel', drivetrain: 'RWD', category: 'SUV' },

  // BMW M
  { make: 'BMW', model: 'M2', power: 460, seats: 4, accel: 4.1, gearbox: 'Auto', fuel: 'Petrol', drivetrain: 'RWD', category: 'Sport' },
  { make: 'BMW', model: 'M3 Competition', power: 503, seats: 5, accel: 3.9, gearbox: 'Auto', fuel: 'Petrol', drivetrain: 'AWD', category: 'Sport' },
  { make: 'BMW', model: 'M3', power: 473, seats: 5, accel: 4.1, gearbox: 'Auto', fuel: 'Petrol', drivetrain: 'RWD', category: 'Sport' },
  { make: 'BMW', model: 'M4', power: 503, seats: 4, accel: 3.9, gearbox: 'Auto', fuel: 'Petrol', drivetrain: 'AWD', category: 'Sport' },
  { make: 'BMW', model: 'M5', power: 717, seats: 5, accel: 3.5, gearbox: 'Auto', fuel: 'Plug-in hybrid', drivetrain: 'AWD', category: 'Sport' },
  { make: 'BMW', model: 'M8', power: 617, seats: 4, accel: 3.2, gearbox: 'Auto', fuel: 'Petrol', drivetrain: 'AWD', category: 'GT' },
  { make: 'BMW', model: 'X5 M', power: 617, seats: 5, accel: 3.9, gearbox: 'Auto', fuel: 'Petrol', drivetrain: 'AWD', category: 'SUV' },
  { make: 'BMW', model: 'i7', power: 544, seats: 5, accel: 4.7, gearbox: 'Auto', fuel: 'Electric', drivetrain: 'AWD', category: 'GT' },

  // Audi
  { make: 'Audi', model: 'R8 V10 performance', power: 620, seats: 2, accel: 3.1, gearbox: 'DCT', fuel: 'Petrol', drivetrain: 'AWD', category: 'Exotic' },
  { make: 'Audi', model: 'R8', power: 570, seats: 2, accel: 3.4, gearbox: 'DCT', fuel: 'Petrol', drivetrain: 'AWD', category: 'Exotic' },
  { make: 'Audi', model: 'RS6 Avant', power: 591, seats: 5, accel: 3.6, gearbox: 'Auto', fuel: 'Mild hybrid', drivetrain: 'AWD', category: 'Sport' },
  { make: 'Audi', model: 'RS7', power: 591, seats: 5, accel: 3.6, gearbox: 'Auto', fuel: 'Mild hybrid', drivetrain: 'AWD', category: 'GT' },
  { make: 'Audi', model: 'RS Q8', power: 591, seats: 5, accel: 3.8, gearbox: 'Auto', fuel: 'Mild hybrid', drivetrain: 'AWD', category: 'SUV' },
  { make: 'Audi', model: 'RS e-tron GT', power: 637, seats: 4, accel: 3.3, gearbox: 'Auto', fuel: 'Electric', drivetrain: 'AWD', category: 'GT' },
  { make: 'Audi', model: 'RS3', power: 401, seats: 5, accel: 3.8, gearbox: 'DCT', fuel: 'Petrol', drivetrain: 'AWD', category: 'Sport' },

  // Bentley
  { make: 'Bentley', model: 'Continental GT Speed', power: 650, seats: 4, accel: 3.5, gearbox: 'Auto', fuel: 'Petrol', drivetrain: 'AWD', category: 'GT' },
  { make: 'Bentley', model: 'Continental GT', power: 542, seats: 4, accel: 3.9, gearbox: 'Auto', fuel: 'Petrol', drivetrain: 'AWD', category: 'GT' },
  { make: 'Bentley', model: 'Bentayga', power: 542, seats: 5, accel: 4.4, gearbox: 'Auto', fuel: 'Petrol', drivetrain: 'AWD', category: 'SUV' },
  { make: 'Bentley', model: 'Flying Spur', power: 542, seats: 5, accel: 4.0, gearbox: 'Auto', fuel: 'Petrol', drivetrain: 'AWD', category: 'GT' },

  // Aston Martin
  { make: 'Aston Martin', model: 'DB12', power: 671, seats: 4, accel: 3.5, gearbox: 'Auto', fuel: 'Petrol', drivetrain: 'RWD', category: 'GT' },
  { make: 'Aston Martin', model: 'DB11', power: 503, seats: 4, accel: 4.0, gearbox: 'Auto', fuel: 'Petrol', drivetrain: 'RWD', category: 'GT' },
  { make: 'Aston Martin', model: 'Vantage', power: 656, seats: 2, accel: 3.5, gearbox: 'Auto', fuel: 'Petrol', drivetrain: 'RWD', category: 'Sport' },
  { make: 'Aston Martin', model: 'DBX707', power: 697, seats: 5, accel: 3.3, gearbox: 'Auto', fuel: 'Petrol', drivetrain: 'AWD', category: 'SUV' },

  // McLaren
  { make: 'McLaren', model: '750S', power: 740, seats: 2, accel: 2.7, gearbox: 'DCT', fuel: 'Petrol', drivetrain: 'RWD', category: 'Exotic' },
  { make: 'McLaren', model: '720S', power: 710, seats: 2, accel: 2.8, gearbox: 'DCT', fuel: 'Petrol', drivetrain: 'RWD', category: 'Exotic' },
  { make: 'McLaren', model: 'Artura', power: 671, seats: 2, accel: 3.0, gearbox: 'DCT', fuel: 'Plug-in hybrid', drivetrain: 'RWD', category: 'Exotic' },
  { make: 'McLaren', model: 'GT', power: 612, seats: 2, accel: 3.1, gearbox: 'DCT', fuel: 'Petrol', drivetrain: 'RWD', category: 'GT' },

  // Range Rover / Land Rover
  { make: 'Range Rover', model: 'Autobiography', power: 523, seats: 5, accel: 4.6, gearbox: 'Auto', fuel: 'Mild hybrid', drivetrain: 'AWD', category: 'SUV' },
  { make: 'Range Rover', model: 'Sport', power: 523, seats: 5, accel: 4.5, gearbox: 'Auto', fuel: 'Mild hybrid', drivetrain: 'AWD', category: 'SUV' },
  { make: 'Land Rover', model: 'Defender', power: 296, seats: 5, accel: 7.1, gearbox: 'Auto', fuel: 'Mild hybrid', drivetrain: 'AWD', category: 'SUV' },

  // Maserati
  { make: 'Maserati', model: 'MC20', power: 621, seats: 2, accel: 2.9, gearbox: 'DCT', fuel: 'Petrol', drivetrain: 'RWD', category: 'Exotic' },
  { make: 'Maserati', model: 'GranTurismo', power: 542, seats: 4, accel: 3.5, gearbox: 'Auto', fuel: 'Petrol', drivetrain: 'AWD', category: 'GT' },
  { make: 'Maserati', model: 'Levante', power: 424, seats: 5, accel: 5.2, gearbox: 'Auto', fuel: 'Petrol', drivetrain: 'AWD', category: 'SUV' },
  { make: 'Maserati', model: 'Grecale', power: 325, seats: 5, accel: 5.3, gearbox: 'Auto', fuel: 'Mild hybrid', drivetrain: 'AWD', category: 'SUV' },

  // Rolls-Royce
  { make: 'Rolls-Royce', model: 'Ghost', power: 563, seats: 5, accel: 4.8, gearbox: 'Auto', fuel: 'Petrol', drivetrain: 'AWD', category: 'GT' },
  { make: 'Rolls-Royce', model: 'Cullinan', power: 563, seats: 5, accel: 4.9, gearbox: 'Auto', fuel: 'Petrol', drivetrain: 'AWD', category: 'SUV' },
  { make: 'Rolls-Royce', model: 'Spectre', power: 577, seats: 4, accel: 4.4, gearbox: 'Auto', fuel: 'Electric', drivetrain: 'AWD', category: 'GT' },
  { make: 'Rolls-Royce', model: 'Phantom', power: 563, seats: 5, accel: 5.1, gearbox: 'Auto', fuel: 'Petrol', drivetrain: 'RWD', category: 'GT' },

  // Tesla
  { make: 'Tesla', model: 'Model S Plaid', power: 1020, seats: 5, accel: 2.1, gearbox: 'Auto', fuel: 'Electric', drivetrain: 'AWD', category: 'GT' },
  { make: 'Tesla', model: 'Model S', power: 670, seats: 5, accel: 3.1, gearbox: 'Auto', fuel: 'Electric', drivetrain: 'AWD', category: 'GT' },
  { make: 'Tesla', model: 'Model X Plaid', power: 1020, seats: 6, accel: 2.5, gearbox: 'Auto', fuel: 'Electric', drivetrain: 'AWD', category: 'SUV' },
  { make: 'Tesla', model: 'Model 3 Performance', power: 510, seats: 5, accel: 3.1, gearbox: 'Auto', fuel: 'Electric', drivetrain: 'AWD', category: 'Sport' },
];

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Fuzzy match on make + model. Returns the most specific (longest model) match,
// or null. Result includes a display `name` for the prefill note.
export function lookupSpecs(make, model) {
  const m = norm(make);
  const md = norm(model);
  if (!m || !md) return null;

  let best = null;
  let bestLen = -1;
  for (const e of DB) {
    const em = norm(e.make);
    const emd = norm(e.model);
    const makeOk = m.includes(em) || em.includes(m);
    if (!makeOk) continue;
    const modelOk = md.includes(emd) || emd.includes(md);
    if (!modelOk) continue;
    if (emd.length > bestLen) { best = e; bestLen = emd.length; }
  }
  return best ? { ...best, name: `${best.make} ${best.model}` } : null;
}
