var ultimoSaldo = '0.00';
var reportStartDate = new Date();
var reportEndDate = new Date();
var fileName = 'fileOfx.ofx';

function convertFile() {
    let inputFile = document.getElementById('csvFile');
    var fileUploadedName = inputFile.value.substring(inputFile.value.lastIndexOf('\\') + 1);
    fileName = fileUploadedName.substring(0, fileUploadedName.length - 3) + 'ofx';

    let file = inputFile.files[0];
    let reader = new FileReader();

    reader.onload = function (progressEvent) {
        let lines = this.result.split('\n');
        let parsedData = [];
        for (let line = 2; line < lines.length; line++) {
            let lineData = lines[line].split(';');

            let data = convertTextDate(lineData[0]);
            let codigo = lineData[1];
            let descricao = lineData[2];
            let conta = lineData[3];
            let valor = formatCurrency(lineData[4]);
            let saldo = formatCurrency(lineData[5]);

            if (line == 2) {
                reportStartDate = data;
            } else if (line == lines.length - 1) {
                reportEndDate = data;
                ultimoSaldo = saldo;
                continue;
            } else {
                if (!codigo || codigo === ' ') {
                    continue;
                }
            }
            parsedData.push({ data, codigo, descricao, conta, valor, saldo });
        }

        let result = generateOfxFile(parsedData);
        let blob = new Blob([result], { type: 'text/plain' });
        let link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
    };
    reader.readAsText(file);
};

function generateOfxFile(parsedData) {
    let ofxFileHeader = 'OFXHEADER:100\n' +
        'DATA:OFXSGML\n' +
        'VERSION:102\n' +
        'SECURITY:NONE\n' +
        'ENCODING:UTF-8\n' +
        'CHARSET:NONE\n' +
        'COMPRESSION:NONE\n' +
        'OLDFILEUID:NONE\n' +
        'NEWFILEUID:NONE\n';

    let ofxFile = { OFX: { SignOnMsgSrv1: { SonRs: {} } } };
    ofxFile.OFX.SignOnMsgSrv1.SonRs.Status = {};
    ofxFile.OFX.SignOnMsgSrv1.SonRs.Status.Code = 0;
    ofxFile.OFX.SignOnMsgSrv1.SonRs.Status.Severity = 'INFO';
    ofxFile.OFX.SignOnMsgSrv1.SonRs.DtServer = convertDate(new Date());
    ofxFile.OFX.SignOnMsgSrv1.SonRs.Language = 'POR';
    ofxFile.OFX.SignOnMsgSrv1.SonRs.Fi = {};
    ofxFile.OFX.SignOnMsgSrv1.SonRs.Fi.Org = 'Pagseguro Internet S.A.';
    ofxFile.OFX.SignOnMsgSrv1.SonRs.Fi.Fid = 290;

    ofxFile.OFX.BankMsgSrv1 = {};
    ofxFile.OFX.BankMsgSrv1.StmtTrnRs = {};
    ofxFile.OFX.BankMsgSrv1.StmtTrnRs.TrnuId = 1;

    ofxFile.OFX.BankMsgSrv1.StmtTrnRs.Status = {};
    ofxFile.OFX.BankMsgSrv1.StmtTrnRs.Status.Code = 0;
    ofxFile.OFX.BankMsgSrv1.StmtTrnRs.Status.Severity = 'INFO';

    ofxFile.OFX.BankMsgSrv1.StmtTrnRs.Stmtrs = {};
    ofxFile.OFX.BankMsgSrv1.StmtTrnRs.Stmtrs.CurDef = 'BRL';
    ofxFile.OFX.BankMsgSrv1.StmtTrnRs.Stmtrs.BankAcctFrom = {};
    ofxFile.OFX.BankMsgSrv1.StmtTrnRs.Stmtrs.BankAcctFrom.BankId = '0290';
    ofxFile.OFX.BankMsgSrv1.StmtTrnRs.Stmtrs.BankAcctFrom.BranchId = '0001';
    ofxFile.OFX.BankMsgSrv1.StmtTrnRs.Stmtrs.BankAcctFrom.AcctId = '31576223-7';
    ofxFile.OFX.BankMsgSrv1.StmtTrnRs.Stmtrs.BankAcctFrom.AcctType = 'CHECKING';

    ofxFile.OFX.BankMsgSrv1.StmtTrnRs.Stmtrs.BankTransList = {};
    ofxFile.OFX.BankMsgSrv1.StmtTrnRs.Stmtrs.BankTransList.DtStart = convertDate(reportStartDate);
    ofxFile.OFX.BankMsgSrv1.StmtTrnRs.Stmtrs.BankTransList.DtEnd = convertDate(reportEndDate);

    ofxFile.OFX.BankMsgSrv1.StmtTrnRs.Stmtrs.BankTransList.Stmttrn = [];

    for (let i = 0; i < parsedData.length; i++) {
        let stmttrn = {};
        stmttrn.TrnType = parsedData[i].valor > 0 ? 'CREDIT' : 'DEBIT';
        stmttrn.DtPosted = convertDate(parsedData[i].data);
        stmttrn.TrnAmt = parsedData[i].valor;
        stmttrn.FitId = parsedData[i].codigo;
        stmttrn.Memo = parsedData[i].descricao;

        ofxFile.OFX.BankMsgSrv1.StmtTrnRs.Stmtrs.BankTransList.Stmttrn.push(stmttrn);
    }

    ofxFile.OFX.BankMsgSrv1.StmtTrnRs.Stmtrs.LedgerBal = {};
    ofxFile.OFX.BankMsgSrv1.StmtTrnRs.Stmtrs.LedgerBal.DtaSof = convertDate(new Date());
    ofxFile.OFX.BankMsgSrv1.StmtTrnRs.Stmtrs.LedgerBal.Balamt = ultimoSaldo;


    let ofxBody = OBJtoXML(ofxFile, 0);
    let result = ofxFileHeader + ofxBody;
    console.log(result);
    return result;
}

function formatCurrency(value) {
    if (!value) {
        return '0.00';
    } else {
        value = value.replace('.', '').replace(',', '');
        return parseFloat(value).toFixed(2);
    }
}

function OBJtoXML(obj, interaction) {
    let xml = '';
    for (let prop in obj) {
        xml += obj[prop] instanceof Array ? '' : "<" + prop.toUpperCase() + ">\n";
        if (obj[prop] instanceof Array) {
            for (let array in obj[prop]) {
                xml += "<" + prop.toUpperCase() + ">\n";
                xml += OBJtoXML(new Object(obj[prop][array]));
                xml += "</" + prop.toUpperCase() + ">\n";
            }
        } else if (typeof obj[prop] == "object") {
            xml += OBJtoXML(new Object(obj[prop]), interaction++);
        } else {
            xml += obj[prop] + '\n';
        }
        xml += obj[prop] instanceof Array ? '' : "</" + prop.toUpperCase() + ">\n";
    }
    return xml.replace(/<\/?[0-9]{1,}>/g, '');
}

function padLeft(num, targetLength, padChar) {
    padChar = padChar === ' ' ? padChar : '0';
    return num.toString().padStart(targetLength | 2, padChar);
}

function convertDate(dateToFormat) {
    if (dateToFormat instanceof String) {
        dateToFormat = new Date();
        //Set the date to the date passed in

    }
    let year = dateToFormat.getFullYear();
    let month = dateToFormat.getMonth() + 1;
    let day = dateToFormat.getDate();
    let hours = dateToFormat.getHours();
    let minutes = dateToFormat.getMinutes();
    let seconds = dateToFormat.getSeconds();
    let timeZone = 0 - (dateToFormat.getTimezoneOffset() / 60);

    //20220801000000[-3:BRT]
    return year + padLeft(month) + padLeft(day) + padLeft(hours) + padLeft(minutes) + padLeft(seconds) + '[' + timeZone + ':BRT]';
}

function convertTextDate(dateToFormat) {
    let dtArray = dateToFormat.split(' ');
    let dt = dtArray[0].split('/');
    let time = dtArray[1] ? dtArray[1].split(':') : [0, 0, 0];
    let date = new Date(dt[2], dt[1] - 1, dt[0], time[0], time[1], time[2]);

    return date;
}