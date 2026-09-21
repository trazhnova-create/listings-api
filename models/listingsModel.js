
let listings = [
  {
    id: 1,
    title: 'iPhone 12, 128GB',
    description: 'Небольшие царапины на корпусе, аккумулятор 87%, всё работает исправно.',
    category: 'Электроника',
    price: 25000,
    dealType: 'sale',
    condition: 'used',
    sellerId: 1,
    status: 'available',
    createdAt: new Date('2026-08-01T10:00:00Z').toISOString(),
  },
  {
    id: 2,
    title: 'Зимняя куртка The North Face, размер L',
    description: 'Носилась один сезон, состояние отличное.',
    category: 'Одежда',
    price: 3500,
    dealType: 'sale',
    condition: 'used',
    sellerId: 2,
    status: 'available',
    createdAt: new Date('2026-08-02T12:30:00Z').toISOString(),
  },
  {
    id: 3,
    title: 'Книжный шкаф ИКЕА Billy',
    description: 'Обмен на письменный стол. Разборный, легко перевезти.',
    category: 'Мебель',
    price: 0,
    dealType: 'exchange',
    condition: 'used',
    sellerId: 3,
    status: 'available',
    createdAt: new Date('2026-08-03T09:15:00Z').toISOString(),
  },
  {
    id: 4,
    title: 'Игровая приставка PlayStation 4',
    description: 'В комплекте 2 геймпада и 3 диска. Продаю в связи с переходом на ПК.',
    category: 'Электроника',
    price: 15000,
    dealType: 'sale',
    condition: 'used',
    sellerId: 1,
    status: 'reserved',
    createdAt: new Date('2026-08-04T14:45:00Z').toISOString(),
  },
  {
    id: 5,
    title: 'Велосипед горный Stern, б/у',
    description: 'Требует замены цепи, в остальном полностью исправен.',
    category: 'Спорт',
    price: 0,
    dealType: 'exchange',
    condition: 'for_parts',
    sellerId: 4,
    status: 'available',
    createdAt: new Date('2026-08-05T08:00:00Z').toISOString(),
  },
  {
    id: 6,
    title: 'Кофемашина DeLonghi',
    description: 'Продаю в связи с переездом. Полный комплект документов.',
    category: 'Бытовая техника',
    price: 8000,
    dealType: 'sale',
    condition: 'used',
    sellerId: 5,
    status: 'sold',
    createdAt: new Date('2026-08-06T11:20:00Z').toISOString(),
  },
];

let nextId = listings.length + 1;

function getAll(filters = {}) {
  let result = [...listings];

  if (filters.category) {
    result = result.filter(
      (l) => l.category.toLowerCase() === filters.category.toLowerCase()
    );
  }
  if (filters.status) {
    result = result.filter(
      (l) => l.status.toLowerCase() === filters.status.toLowerCase()
    );
  }
  if (filters.dealType) {
    result = result.filter(
      (l) => l.dealType.toLowerCase() === filters.dealType.toLowerCase()
    );
  }

  return result;
}

function getById(id) {
  return listings.find((l) => l.id === id);
}

function create(data) {
  const price = typeof data.price === 'number' ? data.price : 0;
  const newListing = {
    id: nextId++,
    title: data.title,
    description: data.description || '',
    category: data.category,
    price,
    dealType: price > 0 ? 'sale' : 'exchange',
    condition: data.condition || 'used',
    sellerId: data.sellerId ?? null,
    status: data.status || 'available',
    createdAt: new Date().toISOString(),
  };
  listings.push(newListing);
  return newListing;
}

function update(id, data) {
  const index = listings.findIndex((l) => l.id === id);
  if (index === -1) return null;

  const price = typeof data.price === 'number' ? data.price : listings[index].price;
  const updated = {
    ...listings[index],
    title: data.title,
    description: data.description ?? listings[index].description,
    category: data.category,
    price,
    dealType: price > 0 ? 'sale' : 'exchange',
    condition: data.condition || listings[index].condition,
    sellerId: data.sellerId ?? listings[index].sellerId,
    status: data.status || listings[index].status,
  };

  listings[index] = updated;
  return updated;
}

function remove(id) {
  const index = listings.findIndex((l) => l.id === id);
  if (index === -1) return null;
  const [deleted] = listings.splice(index, 1);
  return deleted;
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};
