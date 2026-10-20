function ListingFilters({
  categories, categoryFilter, setCategoryFilter,
  sortBy, setSortBy,
  searchQuery, setSearchQuery,
  minPrice, setMinPrice,
  maxPrice, setMaxPrice,
}) {
  return (
    <div className="listing-filters">
      <input
        type="text"
        className="listing-filters__search"
        placeholder="Поиск по названию"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
        <option value="all">Все категории</option>
        {categories.map((cat) => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>

      <input
        type="number"
        className="listing-filters__price"
        placeholder="Цена от"
        value={minPrice}
        onChange={(e) => setMinPrice(e.target.value)}
      />

      <input
        type="number"
        className="listing-filters__price"
        placeholder="Цена до"
        value={maxPrice}
        onChange={(e) => setMaxPrice(e.target.value)}
      />

      <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
        <option value="new">Сначала новые</option>
        <option value="old">Сначала старые</option>
        <option value="priceAsc">Цена: по возрастанию</option>
        <option value="priceDesc">Цена: по убыванию</option>
      </select>
    </div>
  );
}

export default ListingFilters;