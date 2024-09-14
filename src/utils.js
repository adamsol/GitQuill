
import _ from 'lodash';
import pluralize from 'pluralize';

_.title = s => _.upperFirst(s.replace('_', ' '));
_.pluralize = pluralize;

_.exclude = (array, predicate) => {
    array = [...array];
    _.remove(array, predicate);
    return array;
};

export default _;
