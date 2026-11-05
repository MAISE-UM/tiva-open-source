import styled from "styled-components";

export const flexColumn = `
    display:flex;
    flex-flow:column;
`

export const flexRow = `
	display:flex;
    flex-flow:row;
`

export const centerInnerElement = `
	align-items : center;
	display : flex;    
    justify-content: center;
`

export const flexDirections = {
    column: {
        display: 'flex'
        , flexFlow: 'column'
    },
    row: {
        display: 'flex'
        , flexFlow: 'row'
    }
}

export const marginPixels = {
    zero: {
        margin: '0px'
    },
    five: {
        margin: '5px'
    },
    fiveTop: {
        marginTop: '5px'
    },
    fiveBottom: {
        marginBottom: '5px'
    },
    fiveExcludingRight: {
        margin: '5px 0 5px 5px'
    },
    fiveExcludingBottom: {
        margin: '5px 5px 0 5px'
    },
    fiveLeft: {
        marginLeft: '5px'
    },
    fiveRight: {
        marginRight: '5px'
    },
    fiveLeftRight: {
        margin: '0px 5px 0 5px'
    },
    ten: {
        margin: '10px'
    },
    fifteen: {
        margin: '15px'
    },
    twenty: {
        margin: '20px'
    },
    thirtyTop: {
        marginTop: '30px'
    },
    oneHundredFiftyRight: {
        marginRight: '150px'
    }
}

export const maxWidth = {
    ninetyPercent: {
        maxWidth: '90%'
    }
    , fifty: {
        maxWidth: '50px'
    }
    , sevenHundred: {
        maxWidth: '700px'
    }
    , nineHundred: {
        maxWidth: '900px'
    }
    , oneThousand: {
        maxWidth: '1000px',
    }
}

// Styles Components
interface TabProps {
    $active: boolean;
}

export const Tab = styled.div<TabProps>`
    ${flexColumn};
    background-color: ${(props) => (props.$active ? '#00274C' : 'lightgray')};
    border-radius: 15px 15px 0 0;
    color: white;
    cursor: ${(props) => (props.$active ? 'pointer' : 'not-allowed')};
    display: flex;
    flex: 1 1 auto;
    justify-content: center;
    text-align: center;
`;

export const TabContainer = styled.div`
    ${flexRow};
    height: 35px;
    justify-content: space-around;
`;

export const TabTitle = styled.div`
    margin-top: 0;
`;

export const Section = styled.div`
    background-color: white;
    border-radius: 5px;
    box-shadow: rgba(0, 0, 0, 0.2) 0 1px 8px 0, rgba(0, 0, 0, 0.14) 0 3px 4px 0, rgba(0, 0, 0, 0.12) 0 3px 3px -2px;
    margin-bottom: 5px;
    padding: 5px;
`

export const SplitBySides = styled.div`
    display: flex;
    flex: 1 1 auto;
    justify-content: space-between;
`

export const ModalHeader = styled.div`
    color: #fff;
    background-color: #00274c;
    padding: 15px;
`;