/* https://swagger.io/specification/#runtime-expressions */

type ASCII =
  | '\x00'
  | '\x01'
  | '\x02'
  | '\x03'
  | '\x04'
  | '\x05'
  | '\x06'
  | '\x07'
  | '\x08'
  | '\x09'
  | '\x0a'
  | '\x0b'
  | '\x0c'
  | '\x0d'
  | '\x0e'
  | '\x0f'
  | '\x10'
  | '\x11'
  | '\x12'
  | '\x13'
  | '\x14'
  | '\x15'
  | '\x16'
  | '\x17'
  | '\x18'
  | '\x19'
  | '\x1a'
  | '\x1b'
  | '\x1c'
  | '\x1d'
  | '\x1e'
  | '\x1f'
  | '\x20'
  | '\x21'
  | '\x22'
  | '\x23'
  | '\x24'
  | '\x25'
  | '\x26'
  | '\x27'
  | '\x28'
  | '\x29'
  | '\x2a'
  | '\x2b'
  | '\x2c'
  | '\x2d'
  | '\x2e'
  | '\x2f'
  | '\x30'
  | '\x31'
  | '\x32'
  | '\x33'
  | '\x34'
  | '\x35'
  | '\x36'
  | '\x37'
  | '\x38'
  | '\x39'
  | '\x3a'
  | '\x3b'
  | '\x3c'
  | '\x3d'
  | '\x3e'
  | '\x3f'
  | '\x40'
  | '\x41'
  | '\x42'
  | '\x43'
  | '\x44'
  | '\x45'
  | '\x46'
  | '\x47'
  | '\x48'
  | '\x49'
  | '\x4a'
  | '\x4b'
  | '\x4c'
  | '\x4d'
  | '\x4e'
  | '\x4f'
  | '\x50'
  | '\x51'
  | '\x52'
  | '\x53'
  | '\x54'
  | '\x55'
  | '\x56'
  | '\x57'
  | '\x58'
  | '\x59'
  | '\x5a'
  | '\x5b'
  | '\x5c'
  | '\x5d'
  | '\x5e'
  | '\x5f'
  | '\x60'
  | '\x61'
  | '\x62'
  | '\x63'
  | '\x64'
  | '\x65'
  | '\x66'
  | '\x67'
  | '\x68'
  | '\x69'
  | '\x6a'
  | '\x6b'
  | '\x6c'
  | '\x6d'
  | '\x6e'
  | '\x6f'
  | '\x70'
  | '\x71'
  | '\x72'
  | '\x73'
  | '\x74'
  | '\x75'
  | '\x76'
  | '\x77'
  | '\x78'
  | '\x79'
  | '\x7a'
  | '\x7b'
  | '\x7c'
  | '\x7d'
  | '\x7e';

type DIGIT = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
type ALPHA =
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'f'
  | 'g'
  | 'h'
  | 'i'
  | 'j'
  | 'k'
  | 'l'
  | 'm'
  | 'n'
  | 'o'
  | 'p'
  | 'q'
  | 'r'
  | 's'
  | 't'
  | 'u'
  | 'v'
  | 'w'
  | 'x'
  | 'y'
  | 'z'
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'I'
  | 'J'
  | 'K'
  | 'L'
  | 'M'
  | 'N'
  | 'O'
  | 'P'
  | 'Q'
  | 'R'
  | 'S'
  | 'T'
  | 'Z'
  | 'V'
  | 'W'
  | 'X'
  | 'Y';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type CHAR = ASCII;

type SOURCE = HEADER_REFERENCE | QUERY_REFERENCE | PATH_REFERENCE | BODY_REFERENCE;
type HEADER_REFERENCE = `header.${TOKEN}`;
type QUERY_REFERENCE = `query.${NAME}`;
type PATH_REFERENCE = `path.${NAME}`;
type BODY_REFERENCE = 'body' | `body#${JSON_POINTER}`;
// TS does not allow for circular references, so defining with limited depth of 10
// don't @ me
type JSON_POINTER_STEP = `/${REFERENCE_TOKEN}`;
type JSON_POINTER =
  | ''
  | JSON_POINTER_STEP
  | `${JSON_POINTER_STEP}${JSON_POINTER_STEP}`
  | `${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}`
  | `${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}`
  | `${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}`
  | `${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}`
  | `${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}`
  | `${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}`
  | `${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}`
  | `${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}${JSON_POINTER_STEP}`;

//type REFERENCE_TOKEN = '' | UNESCAPED | ESCAPED | `${REFERENCE_TOKEN}${UNESCAPED | ESCAPED}`;
// %x2F ('/') and %x7E ('~') are excluded from 'unescaped'
//unescaped       = %x00-2E / %x30-7D / %x7F-10FFFF
// unrepresentable in TS
// representing '~' and '/', respectively
//type ESCAPED = `~${'0' | '1'}`;

type REFERENCE_TOKEN = string;

//type NAME = '' | CHAR | `${CHAR}${NAME}`;
// unrepresentable (not easily) in TS
type NAME = string;

// type TOKEN = TCHAR | `${TCHAR}${TOKEN}`;
// unrepresentable (not easily in TS)
type TOKEN = string;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type TCHAR =
  | '!'
  | '#'
  | '$'
  | '%'
  | '&'
  | "'"
  | '*'
  | '+'
  | '-'
  | '.'
  | '^'
  | '_'
  | '`'
  | '|'
  | '~'
  | DIGIT
  | ALPHA;

/**
 * https://swagger.io/specification/#runtime-expressions
 */
type RuntimeExpression =
  | '$url'
  | '$method'
  | '$statusCode'
  | `$request.${SOURCE}`
  | `$response.${SOURCE}`;
export default RuntimeExpression;
