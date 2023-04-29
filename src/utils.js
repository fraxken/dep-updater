/**
 * @function taggedString
 * @memberof Utils#
 * @description Create a tagged String
 * @param {!string} chaines initial string
 * @param {any[]} cles string keys
 * @returns {Function} Return clojure function to build the final string
 *
 * @example
 * const myStrClojure = taggedString`Hello ${0}!`;
 * console.log(myStrClojure("Thomas")); // stdout: Hello Thomas!
 */
export function taggedString(chaines, ...cles) {
  return function cur(...valeurs) {
    const dict = valeurs[valeurs.length - 1] || {};
    const resultat = [chaines[0]];
    cles.forEach((cle, index) => {
      resultat.push(
        typeof cle === "number" ? valeurs[cle] : dict[cle],
        chaines[index + 1]
      );
    });

    return resultat.join("");
  };
}

/**
 * @function parseOutDatedDependencies
 * @memberof Utils#
 * @param {!Buffer} stdout stdout
 * @returns {Depup.Dependencies[]}
 */
export function parseOutDatedDependencies(stdout) {
  const result = JSON.parse(stdout.toString());

  for (const [name, pkg] of Object.entries(result)) {
    pkg.name = name;
    pkg.breaking = pkg.wanted !== pkg.latest;
  }

  return Object.values(result);
}

/**
 * @function findPkgKind
 * @memberof Utils#
 * @param {*} packageJSON packageJSON
 * @param {Depup.Dependencies} pkg pkg
 * @returns {string}
 */
export function findPkgKind(packageJSON, pkg) {
  const dependencies = packageJSON.dependencies || {};
  if (Reflect.has(dependencies, pkg.name)) {
    return "Dependencies";
  }

  const devDependencies = packageJSON.devDependencies || {};
  if (Reflect.has(devDependencies, pkg.name)) {
    return "DevDependencies";
  }

  const optionalDependencies = packageJSON.optionalDependencies || {};
  if (Reflect.has(optionalDependencies, pkg.name)) {
    return "OptDependencies";
  }

  return "Dependencies";
}
