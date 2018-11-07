module.exports = {
  hooks: {
    readPackage,
  },
}

function readPackage(pkg) {
  switch (pkg.name) {
    case 'webpack':
      pkg.dependencies['jquery.i18n'] = 'github:wikimedia/jquery.i18n'
      pkg.dependencies['iconv-lite'] = 'github:ashtuchkin/iconv-lite'
      break
  }
  return pkg
}
