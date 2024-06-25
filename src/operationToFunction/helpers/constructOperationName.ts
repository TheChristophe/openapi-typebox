const constructOperationName = (route: string, method: string) => {
  let segments = route
    // split route
    .split('/')
    // filter out empty parts (first and last)
    // filter out {params}
    .filter((segment) => segment.length > 0 && !segment.startsWith('{') && !segment.endsWith('}'));
  segments.push(method);
  // capitalize first letters (CamelCaseOperationName
  segments = segments.map((segment) => segment[0].toUpperCase() + segment.substring(1));
  // lowercase first letter (camelCase)
  segments[0] = segments[0][0].toLowerCase() + segments[0].substring(1);
  return segments.join('');
};

export default constructOperationName;
