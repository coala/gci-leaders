module.exports = {
  hooks: {
    readPackage,
  },
}

function readPackage(pkg) {
  switch (pkg.name) {
    case 'webpack':
      pkg.dependencies['jquery-i18n'] = 'github:wikimedia/jquery.i18n'
      break
  }
  return pkg
}
