const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const blistSchema = new Schema(
    {
        type: { type: String, default: 'dc' },
        id: { type: String, required: true, unique: true },
        filtered_num: Number,
        article: Array
    }, {
        collection: 'BlackLists'
    }
);

const BlackList = mongoose.model('BlackList', blistSchema);

module.exports = BlackList;
