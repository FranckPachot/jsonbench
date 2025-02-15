db.jsontable.drop();
db.runCommand( {
   create: "jsonbench",
   clusteredIndex: { "key": { id: 1 }, "unique": true, "name": "jsonbench clustered key" }
} )

