db.jsonbench.createIndex({ attr1:1 });
db.jsonbench.find({attr1:{$gt: "M" }}).sort({attr1:1}).limit(5).explain().queryPlanner.winningPlan;
