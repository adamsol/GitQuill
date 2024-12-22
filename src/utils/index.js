
import _ from 'lodash';
import pluralize from 'pluralize';

_.title = s => _.upperFirst(s.replace('_', ' '));
_.pluralize = pluralize;

export default _;
