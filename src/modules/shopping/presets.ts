// Prodotti alimentari comuni da precaricare in una lista (già spuntati:
// si riattivano con un tocco o scrivendone il nome).
export const FOOD_PRESETS: { category: string; items: string[] }[] = [
  { category: 'Frutta', items: ['Mele', 'Banane', 'Arance', 'Mandarini', 'Pere', 'Kiwi', 'Limoni', 'Uva', 'Fragole', 'Mirtilli', 'Ananas', 'Pesche', 'Albicocche', 'Anguria', 'Melone', 'Avocado'] },
  { category: 'Verdura', items: ['Insalata', 'Rucola', 'Pomodori', 'Pomodorini', 'Zucchine', 'Melanzane', 'Peperoni', 'Carote', 'Cipolle', 'Aglio', 'Patate', 'Broccoli', 'Cavolfiore', 'Spinaci', 'Funghi', 'Cetrioli', 'Finocchi', 'Sedano', 'Prezzemolo', 'Basilico'] },
  { category: 'Carne e pesce', items: ['Petto di pollo', 'Fesa di tacchino', 'Macinato', 'Bistecche', 'Salsicce', 'Hamburger', 'Salmone', 'Merluzzo', 'Tonno in scatola', 'Gamberi'] },
  { category: 'Salumi', items: ['Prosciutto crudo', 'Prosciutto cotto', 'Bresaola', 'Salame', 'Mortadella', 'Speck'] },
  { category: 'Latticini e uova', items: ['Uova', 'Latte', 'Burro', 'Yogurt bianco', 'Yogurt greco', 'Mozzarella', 'Parmigiano', 'Grana', 'Ricotta', 'Stracchino', 'Formaggio spalmabile', 'Panna da cucina', 'Mascarpone'] },
  { category: 'Pane e cereali', items: ['Pane', 'Pane in cassetta', 'Piadine', 'Fette biscottate', 'Crackers', 'Grissini', 'Pasta', 'Pasta integrale', 'Riso', 'Riso basmati', 'Farina', 'Gnocchi', 'Pangrattato', 'Lievito', 'Cous cous'] },
  { category: 'Colazione', items: ['Caffè', 'Tè', 'Biscotti', 'Cereali', 'Fiocchi d\'avena', 'Marmellata', 'Miele', 'Crema spalmabile', 'Zucchero', 'Cornetti'] },
  { category: 'Dispensa', items: ['Passata di pomodoro', 'Pelati', 'Legumi in scatola', 'Ceci', 'Lenticchie', 'Fagioli', 'Mais', 'Olive', 'Sottaceti', 'Pesto', 'Brodo', 'Dado', 'Sale', 'Pepe', 'Spezie'] },
  { category: 'Condimenti', items: ['Olio extravergine', 'Olio di semi', 'Aceto', 'Aceto balsamico', 'Maionese', 'Ketchup', 'Senape'] },
  { category: 'Surgelati', items: ['Verdure surgelate', 'Piselli surgelati', 'Spinaci surgelati', 'Pizza surgelata', 'Bastoncini di pesce', 'Gelato', 'Patatine surgelate'] },
  { category: 'Bevande', items: ['Acqua naturale', 'Acqua frizzante', 'Succhi di frutta', 'Coca-Cola', 'Birra', 'Vino', 'Latte vegetale'] },
  { category: 'Snack e dolci', items: ['Cioccolato', 'Patatine', 'Frutta secca', 'Barrette', 'Merendine', 'Popcorn'] },
]

export const FOOD_PRESET_NAMES: string[] = FOOD_PRESETS.flatMap((g) => g.items)
