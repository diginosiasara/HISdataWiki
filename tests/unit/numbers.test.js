const test=require('node:test'),assert=require('node:assert');
const {numbers}=require('../../assets/js/voice/voice.numbers.js');
const cases=[
 ['cuatro seis ocho diez','4 6 8 10'],['noventa y dos','92'],['ciento veinte','120'],['mil doscientos treinta y cuatro','1234'],
 ['veintiuno','21'],['dos mil veinte','2020'],['cuatro coma cinco','4,5'],['cuatro coma veinticinco','4,25'],['cero coma cero cinco','0,05'],
 ['media de cuatro seis y ocho','media de 4 6 y 8'],['menos tres','-3'],['doscientos cuatro','204'],['cien pacientes','100 pacientes'],
 ['un paciente con dos citas','un paciente con 2 citas'],['treinta y un años','31 años'],['quiero la media de noventa y dos noventa y cinco','quiero la media de 92 95'],
 ['mil','1000'],['setenta','70'],['dieciséis','16'],['el 5 de diciembre','el 5 de diciembre']];
for(const [i,o] of cases) test(i,()=>assert.strictEqual(numbers(i),o));
