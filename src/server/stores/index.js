module.exports = async app => {
  const stores = app.get('stores')

  if (stores.file) await require('./file')(app)
}
