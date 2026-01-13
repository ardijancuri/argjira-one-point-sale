# Argjira POS - Udhezuesi i Instalimit

---

## PJESA 1: Ndertimi i Versionit Production (per Zhvilluesin)

### Hapi 1: Nderto Production

Kliko dy here `build-production.bat` ose ekzekuto:

```cmd
cd c:\Users\ardij\OneDrive\Desktop\argjira-crm-main
build-production.bat
```

Kjo krijon automatikisht dosjen `Production` me te gjitha files e nevojshme.

### Hapi 2: Kopjo ne USB

Kopjo dosjen `Production` ne USB. Eshte gati per instalim.

---

## PJESA 2: Instalimi ne Kompjuterin e Klientit

### Hapi 1: Instalo Node.js

1. Shkarko nga: https://nodejs.org/ (versioni LTS)
2. Instalo me opsionet default
3. Rinis kompjuterin

### Hapi 2: Instalo ZFPLab

1. Instalo ZFPLab per printerin Tremol
2. Sigurohu qe punon ne `localhost:4444`

### Hapi 3: Kopjo Dosjet

Kopjo permbajtjen e dosjes `Production` nga USB ne `C:\ArgjiraPOS\`

### Hapi 4: Instalo Dependencies

```cmd
cd C:\ArgjiraPOS\backend
npm install
```

### Hapi 5: Konfiguro Printerin (opsionale)

File `.env` eshte krijuar automatikisht. Nese duhet te ndryshoni COM port-in e printerit:

1. Hap file `C:\ArgjiraPOS\backend\.env` me Notepad
2. Gjej rreshtin `FISCAL_COM_PORT=COM8`
3. Ndrysho `COM8` me portin e duhur (shiko Device Manager)
4. Ruaj file-in

### Hapi 6: Nis Aplikacionin

Kliko dy here `C:\ArgjiraPOS\start.bat`

Hapet automatikisht: http://localhost:3000

---

## Komandat e Shpejta

| Veprimi | Komanda |
|---------|---------|
| Nis serverin | `start.bat` |
| Ndalo serverin | `stop.bat` |
| Nis manualisht | `cd backend && npm run start:production` |
| Nis agent-in | `cd backend && npm run agent` |

---

## Problemet e Zakonshme

**Serveri nuk niset:**
- Kontrollo qe Node.js eshte instaluar: `node --version`
- Kontrollo file `.env` per gabime
- Kontrollo lidhjen e internetit

**Printeri nuk punon:**
- Kontrollo qe ZFPLab eshte duke punuar
- Kontrollo COM port-in ne Device Manager
- Nis printerin dhe provo perseri

**Faqja nuk hapet:**
- Provo manualisht: http://localhost:3000
- Kontrollo qe serveri eshte nisur

---

*Perditesuar: Janar 2026*
