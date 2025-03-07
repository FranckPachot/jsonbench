// Drop the collection if it exists
db.products.drop();

function generateRandomString(length) {
   const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
   let result = '';
   for (let i = 0; i < length; i++) {
       const randomIndex = Math.floor(Math.random() * chars.length);
       result += chars[randomIndex];
   }
   return result;
}

// Create a collection and insert documents
// In MongoDB, collections are created automatically upon insert
for (let i = 1; i <= 1000; i++) {
    db.products.insertOne({
        "_id": i,
        description: generateRandomString(30), // generate and insert random string
        stock: 10000
    });
}
db.products.find()