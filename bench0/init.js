db.jsontable.drop();
db.runCommand( {
   create: "jsonbench",
   clusteredIndex: { "key": { "_id": 1 }, "unique": true, "name": "jsonbench clustered key" }
} )
db.jsonbench.createIndex({ attr1:1 });
db.jsonbench.find({attr1:{$gt: "M" }}).sort({attr1:1}).limit(5).explain().queryPlanner.winningPlan;
