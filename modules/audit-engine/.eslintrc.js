module.exports = {
    'env':{
        'node':true,
        'es6':true
    },
    'extends':'eslint:recommended',
    'rules':{
        'indent':['error', 4, { SwitchCase:1 }],
        'linebreak-style':['error', 'unix'],
        'quotes':['error', 'single'],
        'semi':['error', 'always'],
        'no-console':['off'],
        'no-inner-declarations':['off']
    },
    'parserOptions':{
        'ecmaVersion':2017
    },
    'globals':{
        'document':false,
        'window':false
    }
};
