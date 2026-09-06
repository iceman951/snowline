// A disposable API for browser tests. Never writes to the user's portfolio.
process.env.SNOWLINE_DB = ':memory:';
const { runSeed } = await import('../apps/api/src/db/seed.js');
const { app } = await import('../apps/api/src/index.js');
runSeed();
app.listen(3101);
