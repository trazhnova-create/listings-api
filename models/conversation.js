const mongoose = require('mongoose');


const conversationSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    listingTitle: { type: String, required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sellerEmail: { type: String, required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    buyerEmail: { type: String, required: true },
    lastText: { type: String, default: '' },
    lastAt: { type: Date },
    unreadSeller: { type: Number, default: 0 },
    unreadBuyer: { type: Number, default: 0 },
  },
  { timestamps: true }
);


conversationSchema.index({ listingId: 1, buyerId: 1 }, { unique: true });
conversationSchema.index({ sellerId: 1, updatedAt: -1 });
conversationSchema.index({ buyerId: 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);