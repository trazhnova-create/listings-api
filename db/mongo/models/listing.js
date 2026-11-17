const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  author: { type: String, required: true },
  text: {
    type: String,
    required: [true, 'Текст комментария обязателен'],
    trim: true,
    maxlength: [500, 'Комментарий не длиннее 500 символов'],
  },
  likes: { type: Number, default: 0, min: 0 },
  createdAt: { type: Date, default: Date.now },
});

const listingSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Поле title обязательно'], trim: true },
    description: { type: String, default: '' },
    category: { type: String, required: [true, 'Поле category обязательно'], trim: true },
    price: { type: Number, default: 0, min: [0, 'Цена не может быть отрицательной'] },
    dealType: { type: String, enum: ['sale', 'exchange'] },
    condition: { type: String, enum: ['new', 'used', 'for_parts'], default: 'used' },
    status: { type: String, enum: ['available', 'reserved', 'sold'], default: 'available' },
    image: { type: String, default: '' },
    viewsCount: { type: Number, default: 0 },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    
    tags: { type: [String], default: [] },

    
    location: {
      city: { type: String, default: '' },
      district: { type: String, default: '' },
    },

    
    comments: [commentSchema],
  },
  { timestamps: true } 
);


listingSchema.pre('validate', function () {
  this.dealType = this.price > 0 ? 'sale' : 'exchange';
});


listingSchema.index({ category: 1, price: 1 });
listingSchema.index({ tags: 1 });


listingSchema.methods.canBeModifiedBy = function (user) {
  return user.role === 'admin' || String(this.sellerId) === String(user.id);
};


listingSchema.set('toJSON', {
  transform: (doc, ret) => {
    if (ret._id) ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Listing', listingSchema);