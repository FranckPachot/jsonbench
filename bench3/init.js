db.jsontable.drop();
db.runCommand( {
   create: "jsonbench",
   clusteredIndex: { "key": { "_id": 1 }, "unique": true, "name": "jsonbench clustered key" }
} )

