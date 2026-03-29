#!/usr/bin/env npx tsx
/**
 * WO-236 Phase 1: Contract Verification Report
 * Matches Gmail contract subjects → Supabase couples
 * READ-ONLY — no imports, no writes
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Gmail message map ────────────────────────────────────────────────
const GMAIL_MESSAGES: { id: string; date: string; subject: string }[] = [
  { id: '19d26196505b1112', date: '2026-03-25', subject: 'Veronica_Alex_2026-08-29_RB_Gardens' },
  { id: '19d064963b8d1bef', date: '2026-03-19', subject: 'SIGS_Contract_Kayley_Spencer (Kayley Zizek / Spencer Riddell / 2027-09-18)' },
  { id: '19caf1ba304b09b3', date: '2026-03-02', subject: 'SIGS_Contract_Trina_Matt (Trina Drage / Matt Sestric / 2026-10-24)' },
  { id: '19c6310ceaabcfbd', date: '2026-02-15', subject: 'Christina_Eric Oct 17 2026 Brantford' },
  { id: '19c587ff73d8c68c', date: '2026-02-13', subject: 'Sydney Liam HBS SUN Oct 11,2026 Diplomat' },
  { id: '19c54422a02b8f14', date: '2026-02-12', subject: 'Alyssa & Pasquale May 22,2027' },
  { id: '19c11e6782a626f1', date: '2026-01-30', subject: 'Jessica & Kevin Royal Ambassador July 17, 2027 - UPDATED' },
  { id: '19be60a11244e578', date: '2026-01-22', subject: 'Victoria & Andrew Sept 12,2026' },
  { id: '19be3745c5d11434', date: '2026-01-21', subject: 'Candace & Felice June 20 2026' },
  { id: '19bc91167666aa35', date: '2026-01-16', subject: 'Ariana & James July 17, 2027 Crystal Fountain' },
  { id: '19ac0b3d6d38f17b', date: '2025-11-26', subject: 'Victoria & Luca OBS Aug 28,2027' },
  { id: '19abd29778051669', date: '2025-11-25', subject: 'Claire & Matthew Feb 27 2027' },
  { id: '19a945282fda7441', date: '2025-11-17', subject: 'Jenna Curtis Lakeview Dec 5 2026' },
  { id: '19a7d337df175c80', date: '2025-11-13', subject: 'Emily & Alex Trail Hub SUNDAY Sept 13 2026' },
  { id: '19a6539772ea4e0e', date: '2025-11-08', subject: 'Kisa & Larry FRIDAY July 3rd 2026' },
  { id: '19a5580e60041225', date: '2025-11-05', subject: 'Jennifer Marquis Garden SUN Aug 2nd 2026' },
  { id: '19a5108e648246c4', date: '2025-11-04', subject: 'Nicole, John C Hotel Sep 6,2026' },
  { id: '19a50dd295830079', date: '2025-11-04', subject: 'Victoria_Alberto Opal Palace July 10,2027' },
  { id: '19a49c53e179580b', date: '2025-11-03', subject: 'Christina Cody FRIDAY C Hotel October 16th 2026 PHOTO ONLY' },
  { id: '199d98806ee97ad0', date: '2025-10-12', subject: 'Juliet Kosta SAT May 2nd, 2026' },
  { id: '199b9d8ba624ad54', date: '2025-10-06', subject: '_Sali & Nick SAT May 9th 2026' },
  { id: '199a29159a923322', date: '2025-10-01', subject: '_Justine & Josh White Oaks_Niagara' },
  { id: '19997ab5720131a3', date: '2025-09-29', subject: '_Melanie Flores & Harold; Parkview; May 15,2026' },
  { id: '19983387c1b7218c', date: '2025-09-25', subject: 'Stephanie Carlie Sat Sept 19th Bellvue Manor' },
  { id: '1997c51f33c2e949', date: '2025-09-24', subject: 'Bianca & Michael Paradise Aug 15, 2026' },
  { id: '19967f209d63c696', date: '2025-09-20', subject: 'Julie & Angus May 23, 2026' },
  { id: '1995a1cd43ce15ff', date: '2025-09-17', subject: 'Sarah Zoom Photo only Apr 24,2026' },
  { id: '195e51ecdb3235b2', date: '2025-03-29', subject: '_Gabby & Elkanah MBS Hazelton Sep 19,2025' },
  { id: '19596bdd52087856', date: '2025-03-14', subject: 'Gabrielle FRIDAY Aug 8th,2025' },
  { id: '19510e1d94da3347', date: '2025-02-16', subject: 'Karina Bryan Aug 30,2025' },
  { id: '194fc3c5c0a85208', date: '2025-02-12', subject: 'Terri-Lynn & Jason Dec 7 2025' },
  { id: '194faf58abbab9a7', date: '2025-02-12', subject: 'Alex & Derado HBS Oct 17,2025' },
  { id: '194f2af1c7583c7a', date: '2025-02-10', subject: '8pm Salem CBS Aug 24,2025' },
  { id: '194f132aa6349743', date: '2025-02-10', subject: 'Christina Oct 24,2025 Guelph CBS ZOOM' },
  { id: '194d89bacb9b072e', date: '2025-02-05', subject: '6pm Darrylleigh HBS Sep 5,2026' },
  { id: '194967d3b148d1a5', date: '2025-01-23', subject: '6pm Angelica Arlington Sep 5,2026' },
  { id: '194755f5f456304d', date: '2025-01-17', subject: 'Lisa Eduardo June 21,2025' },
  { id: '194582a5f3e59fbb', date: '2025-01-11', subject: 'Maria & Denis July 31 2026' },
  { id: '193b687e44db7b27', date: '2024-12-11', subject: 'Laura & Alex July 12,2025' },
  { id: '1937f7ae06675ca6', date: '2024-11-30', subject: '_Elise June 6,2026' },
  { id: '193742ff4fa2e705', date: '2024-11-28', subject: 'Sara & Rocco Saturday March 21, 2026' },
  { id: '1933cb48a947dd86', date: '2024-11-17', subject: 'Vanessa & Kevin Oct 25_2025' },
  { id: '1933c1f13843af4d', date: '2024-11-17', subject: 'Fazana & Aman Sept 5&6 2025' },
  { id: '193374e0b2f573e6', date: '2024-11-16', subject: '_Georgia & Nikolas June 26,2026 PHOTO ONLY' },
  { id: '193268f34f15672c', date: '2024-11-13', subject: 'Brittania & Andrew Friday Sept 12 2025' },
  { id: '19318671791365e0', date: '2024-11-10', subject: 'Kara & Tiago June 12,2026 HBS' },
  { id: '193026d81e69fd79', date: '2024-11-06', subject: 'Marina & Eric June 20,2026' },
  { id: '192f4c9d5772725a', date: '2024-11-03', subject: 'Jacquelyn Gabrial HBS Oct 31,2025' },
  { id: '192dfd682c3e48b4', date: '2024-10-30', subject: 'Adriana & James Feb 7th, 2026' },
  { id: '192a22c734abc069', date: '2024-10-18', subject: 'Danielle & Michael Apr 12,2025' },
  { id: '192a229ff8a57ce0', date: '2024-10-18', subject: 'Ashley & Erik Oct 30,2025 CBS' },
  { id: '192927dd90391f7c', date: '2024-10-15', subject: 'Gianluca & Larissa May 30 2026' },
  { id: '19286b4a00864cbc', date: '2024-10-13', subject: 'Jean & Jesse July 26,2025' },
  { id: '192799307d0b2467', date: '2024-10-10', subject: 'Lindsay & Blake CBS Aug 23,2025' },
  { id: '1927621ce2d575cd', date: '2024-10-10', subject: 'Jody & Will Oct 18,2025' },
  { id: '1924fd65321a26a9', date: '2024-10-02', subject: 'Crystal and Bruno Nov 1st' },
  { id: '1924e406220f29f2', date: '2024-10-02', subject: 'Carmela & James March 28,2026' },
  { id: '19244ff4c58d83a7', date: '2024-09-30', subject: 'Amanda & Kyle Oct 12 2025' },
  { id: '1921bfab2d0b6466', date: '2024-09-22', subject: 'Barbara & Bernie Oct 4,2025' },
  { id: '192078477de469c8', date: '2024-09-18', subject: '_Selena & John May 16,2026' },
  { id: '1902d3aee82f10b6', date: '2024-06-18', subject: 'Myrelle Randy Sunday May 4,2025' },
  { id: '18e2f03e76e118e2', date: '2024-03-11', subject: 'Alicia Emilio Dec 6,2025' },
  { id: '18e28ccbc3fa0dd8', date: '2024-03-10', subject: 'Anastasia & Adam MBS May 31,2025' },
  { id: '18e1158a173139a4', date: '2024-03-05', subject: 'Sarah_Alessandro Saturday May 10th,2025' },
  { id: '18dd381c17fe0b26', date: '2024-02-22', subject: 'Theodora & Doug May 18,2025' },
];

// NOTE: 19a945282fda7441 appears twice in the spec (Jenna Curtis) - deduped above
// NOTE: 18dc300ec051968d (Amanda & Justin) marked as RELEASE ONLY - skipped

// ── DB couples ───────────────────────────────────────────────────────
interface DbCouple {
  id: string;
  bride: string;
  groom: string;
  date: string;
  email: string | null;
}

const DB_COUPLES: DbCouple[] = [
  { id: '0ba6676d-1fcc-4a8d-8214-2d0eecb99faa', bride: 'Cassandra Milordi', groom: 'Brandon Rajpaul', date: '2025-02-15', email: 'TheRajpauls@gmail.com' },
  { id: '35d11e68-9d0b-4ad0-a42c-6eaccb747ec1', bride: 'Danielle Genovese', groom: 'Michael Vincent Cordi', date: '2025-04-12', email: 'Dani_Genovese7@hotmail.com' },
  { id: '86af0d03-b6d6-42c3-84b7-0cb1a64cbbdb', bride: 'Myrelle Imperio', groom: 'Randy Singh', date: '2025-05-04', email: 'singhproductions1995@gmail.com' },
  { id: '919e1888-2330-43c3-b22b-2f54bf25936f', bride: 'Sarah Futia', groom: 'Alessandro Fossella', date: '2025-05-10', email: 's.futia@yahoo.ca' },
  { id: '1dd1deb5-e7ea-48d8-a65a-41171339bd8b', bride: 'Theodora Kollias', groom: 'Doug Cartwright', date: '2025-05-18', email: 'TandDcartwright@gmail.com' },
  { id: '87773353-04c9-4e92-b89f-2461d2259344', bride: 'Anastasia Vlasis', groom: 'Adam Salyn', date: '2025-05-31', email: 'Salynwedding@gmail.com' },
  { id: '5518cf0d-45c2-4630-a02c-82a051241aed', bride: 'Jenna-Marie Rankine', groom: 'Michael Silva', date: '2025-05-31', email: 'JM.Rankine@gmail.com' },
  { id: '641d7ef0-ecba-4c0a-80a2-ce81993611ba', bride: 'Lisa Bucci', groom: 'Eduardo Reynoso', date: '2025-06-21', email: 'Lisa.Bucci93@gmail.com' },
  { id: 'ea09afe1-879c-45f4-81a2-65abf39847e1', bride: 'Vittoria Pileggi', groom: 'Vince Speziale', date: '2025-06-28', email: 'Vittoria.Pileggi99@gmail.com' },
  { id: '5462788d-4ba1-418c-b890-58d5a294347b', bride: 'Samantha Whitaker', groom: 'Brenden Certo', date: '2025-06-28', email: 'Whitaker_xo@hotmail.com' },
  { id: 'd78ecbe4-e488-46ee-96e2-1d659feca803', bride: 'Laura Ferreras', groom: 'Alex Martinez', date: '2025-07-12', email: 'Lferreras11@gmail.com' },
  { id: '7e7c8ae1-fd24-48d5-889d-16ae58393d65', bride: 'Jean Reyes', groom: 'Jesse Callaghan', date: '2025-07-26', email: 'j_cal07@hotmail.com' },
  { id: 'c7450f95-40a5-4daa-8914-5d94e75384c4', bride: 'Gabrielle Jaikaran', groom: 'Stephan Plass', date: '2025-08-08', email: 'gjaikaran7@gmail.com' },
  { id: '4cc6287c-6e98-4061-b126-d415de632c28', bride: 'Lindsay Deplitch', groom: 'Blake Bodiam', date: '2025-08-23', email: 'Ldeplitch378@gmail.com' },
  { id: '8bc2a63a-52db-4a6d-9d1e-e5522f694363', bride: 'Alannah Zambri', groom: 'Anthony Cassata', date: '2025-08-23', email: 'AlannahZambri@gmail.com' },
  { id: '1afb36d0-e8ac-4809-9a7f-90e763aaa2f7', bride: 'Salem Kidane', groom: 'Shannon Sarvanandan', date: '2025-08-24', email: 'SalemKidane@gmail.com' },
  { id: '44671322-dc57-4ab3-bfcd-bdd25f17c6c9', bride: 'Erica Veltri', groom: 'Francesco Zappacosta', date: '2025-08-30', email: 'Erica.Veltri@live.ca' },
  { id: '1f40df73-93d2-4fce-a724-0352e385771d', bride: 'Karina Loayza', groom: 'Bryan Ortiz', date: '2025-08-30', email: 'karinaloayza@live.com' },
  { id: 'd6eef00d-fd55-4339-9a73-2621838289dc', bride: 'Fazana Mohamed', groom: 'Aman Razack', date: '2025-09-05', email: 'Amanandfazana@gmail.com' },
  { id: 'd67a6a33-4be7-477a-ad35-c2762d669749', bride: 'Brittania Pineda Antunez', groom: 'Andrew George', date: '2025-09-12', email: 'Andrew_tabman@hotmail.com' },
  { id: 'c2cc8e96-bfc6-40bf-bc69-2f8221c60ac7', bride: 'Gabrielle Mahon', groom: 'Elkanah Morgan', date: '2025-09-19', email: 'M2Mwedding2025@gmail.com' },
  { id: '4a38b2c1-4787-4137-92e3-403b6fa6ef0c', bride: 'Amanda Cabral', groom: 'Kyle Hector', date: '2025-10-12', email: 'Cabrala6193@gmail.com' },
  { id: '14e9d4e1-d692-4e04-ab08-78183988a0da', bride: 'Alexandria Riselay', groom: 'Derado James', date: '2025-10-17', email: 'Alexriselay_6@hotmail.com' },
  { id: '482a2e21-7eb6-4d54-b44d-736e96afea28', bride: 'Jody Macdonald', groom: 'Will Moxey', date: '2025-10-18', email: null },
  { id: 'ce2d6533-0fca-4e04-a223-40f5207d047b', bride: 'Maranda Gregory', groom: 'Curtis Pucci', date: '2025-10-18', email: 'mlbgregory97@gmail.com' },
  { id: 'bda56152-5366-4dc1-a315-21f65647a187', bride: 'Christina Ramsamujh', groom: 'Jasjivan Singh', date: '2025-10-24', email: 'jasjivan.singh7576@gmail.com' },
  { id: 'af702f5f-ac09-4fa6-94f8-d391d4268c5e', bride: 'Edzenia Olivo', groom: 'Martin Steward', date: '2025-10-25', email: 'Martedze@gmail.com' },
  { id: 'b080774f-d48b-480e-82ce-660204ab4adf', bride: 'Vanessa Cancelli', groom: 'Kevin Orfao', date: '2025-10-25', email: 'CancelliOrfao@gmail.com' },
  { id: 'f256b939-a60c-49b1-9f83-541e94132fd5', bride: 'Ashley Moyal', groom: 'Erik Dick', date: '2025-10-30', email: 'AshleyLunamoyal@gmail.com' },
  { id: '128088b7-bbee-43b0-bd59-ceff410702c6', bride: 'Crystal Marki', groom: 'Bruno Antunes', date: '2025-11-01', email: 'crystal_m_78@hotmail.com' },
  { id: '2fff94fe-29b1-4563-8024-9c3acbd81b62', bride: 'Yvonne Moyal', groom: 'Bruce Mandell', date: '2025-11-16', email: 'mandelz@rogers.com' },
  { id: 'fdaf9bde-b810-4a12-bcd9-fe0bdca201bc', bride: 'Alicia Colavito', groom: 'Emilio Ceccarelli', date: '2025-12-06', email: 'wed.ceccarelli@gmail.com' },
  { id: '89a0d218-8228-4ccb-9b56-7d30f581c6cf', bride: 'Terri-Lynn Besko', groom: 'Jason Mcburney', date: '2025-12-07', email: 'Beskohome@yahoo.ca' },
  { id: '00888995-f6ee-43f2-a0e5-4bd9d0653956', bride: 'Adriana Lucchetta', groom: 'James Papaeliou', date: '2026-02-07', email: 'Papaeliou1997@gmail.com' },
  { id: 'e0cfdf91-ea34-4b41-8cff-7c97913307e1', bride: "Sara D'Ambrosio", groom: 'Rocco Briganti', date: '2026-03-21', email: 'sara.sd24@yahoo.ca' },
  { id: '000b69fa-25e5-4262-bdc0-2f90eaeac260', bride: 'Carmela Renzone', groom: 'James Williams', date: '2026-03-28', email: 'CRenzone98@gmail.com' },
  { id: '757627d3-2b25-4b25-acd0-4c813ddcce32', bride: 'Sarah Carey', groom: 'Romen Urso', date: '2026-04-24', email: 'srurso2026@gmail.com' },
  { id: '3712ab0d-0ccc-4bd2-ae52-094a170e27d5', bride: 'Juliet Kaltsounis', groom: 'Kosta Efstathiadis', date: '2026-05-02', email: 'Juliet.kaltsounis@gmail.com' },
  { id: '67c008cc-ebeb-4f9a-948e-b476c637adaf', bride: 'Sali Alhendi', groom: 'Nick Donchev', date: '2026-05-09', email: 'NickDonchev@hotmail.com' },
  { id: 'ce8b3cbf-0436-4f02-ac25-131716d5d4ed', bride: 'Melanie Flores', groom: 'Harold Alvarez', date: '2026-05-15', email: 'melanie14flores@gmail.com' },
  { id: '3f8e7252-3975-47e6-84e2-dcad7b03d3a2', bride: 'Selena Arruda', groom: 'John Bento', date: '2026-05-16', email: 'SelenaMBento@gmail.com' },
  { id: '94d5f278-b868-48ea-b96e-28091347da5f', bride: 'Julie Nodel', groom: 'Angus Serrant', date: '2026-05-23', email: 'Julienodel@rogers.com' },
  { id: 'f565fc33-06db-4a13-9e13-41ed51c10062', bride: 'Larissa DeBarros', groom: 'Gianluca Censoni', date: '2026-05-30', email: 'censoni26@gmail.com' },
  { id: '0df7d0ec-f6bc-46d4-a054-1e52b6103c18', bride: 'Elise Roy', groom: 'Alex Hood', date: '2026-06-06', email: 'hoodalex035@gmail.com' },
  { id: 'd69b463f-eb32-4d21-a12d-c9e0b32200ef', bride: 'Kara Durdle', groom: 'Tiago Sousa', date: '2026-06-12', email: 'karadurdle@hotmail.com' },
  { id: '54cbfcc4-2241-44a6-954a-0df42072b618', bride: 'Marina Gallo', groom: 'Eric Kwiatek', date: '2026-06-20', email: 'Marina_Gallo_9@hotmail.com' },
  { id: 'f140b768-d482-4ec2-a770-538ba0a3e0d4', bride: 'Candace Silveira', groom: 'Felice Digennaro', date: '2026-06-20', email: 'Candacesilveira@yahoo.ca' },
  { id: 'c75b87bc-f326-4727-8236-9c6013428638', bride: 'Justine Beaver', groom: 'Josh Simmons', date: '2026-06-26', email: 'justineandjoshsimmons@gmail.com' },
  { id: 'd5f2739d-f307-4154-86e4-a4da8df1e496', bride: 'Georgia Munro', groom: 'Nikolas Daly', date: '2026-06-26', email: 'GeorgiaMunro01@gmail.com' },
  { id: '8fa99010-234f-492f-abe4-8844cd196c6d', bride: 'Kisa Lopez Villarroel', groom: 'Larry Da Cunha', date: '2026-07-03', email: 'kisai.lopezvillarroel@gmail.com' },
  { id: 'c5f3e5dc-62fe-4a57-8577-bef15a749967', bride: 'Maria Picanco', groom: 'Denis Wood', date: '2026-07-31', email: 'maria_picanco@hotmail.com' },
  { id: '2229f28f-043a-4074-876a-a8cd0b24d93c', bride: 'Jennifer Samar', groom: 'Alvin Manzano', date: '2026-08-02', email: 'jsamar90@hotmail.com' },
  { id: '190ab494-d3f9-4f46-8ab2-325d28b13340', bride: 'Sydney Baker', groom: 'Jason Fisher', date: '2026-08-02', email: 'Baker.sydney2000@gmail.com' },
  { id: 'ccdf04d7-7b01-489b-87b0-86416f161552', bride: 'Bianca Migalbin', groom: 'Michael Macri', date: '2026-08-15', email: 'ABMigalbin@gmail.com' },
  { id: 'bdb19479-f113-4106-b0a0-e885a5dd6eb7', bride: 'Veronica WHITE', groom: 'Alex BELARDO', date: '2026-08-29', email: 'VERONICAWHITE1984@gmail.com' },
  { id: '89922ea9-1172-492a-978d-715beb5449cd', bride: 'Darylliegh Laidman', groom: 'CJ Rusenstrom', date: '2026-09-05', email: 'Darylleigh.marie@hotmail.com' },
  { id: 'dea0a5b1-b043-4019-9106-cabacf82cb80', bride: 'Angelica Meliton', groom: 'Tyler Dzingala', date: '2026-09-05', email: 'AngelicaMeliton@hotmail.com' },
  { id: 'bf99d024-c91e-4cbc-a942-7ffe2b9b9e83', bride: 'Nicole Palma', groom: 'John Sunday', date: '2026-09-06', email: 'Niccipalma@gmail.com' },
  { id: 'fb5234c8-5c04-49da-a170-f8329cd355b3', bride: 'Victoria Brunton', groom: 'Andrew Leroux', date: '2026-09-12', email: 'VBrunton91@gmail.com' },
  { id: '9de0f92e-6a59-4279-80fc-f38364d061be', bride: 'Emily Xuereb', groom: 'Alex Milani', date: '2026-09-13', email: 'enxuereb@gmail.com' },
  { id: '10788891-48a8-4daf-8baa-f3e3a49ca3b6', bride: 'Stephanie Di Vita', groom: 'Carlie Stewart', date: '2026-09-19', email: 'carliemstewart@hotmail.com' },
  { id: 'a55b356f-cad6-486f-b1be-d3faabc31643', bride: 'Barbara Waterfield', groom: 'Bernie Mailloux', date: '2026-10-03', email: 'Bewaterfield@hotmail.com' },
  { id: '4d130b97-be6c-4d88-aee5-fda0134b5a44', bride: 'Sydney Ross', groom: 'Liam Sexton', date: '2026-10-11', email: 'rosssy633@gmail.com' },
  { id: '157bd097-3e9f-4445-a66d-4f73a93a241b', bride: 'Christina Haw', groom: 'Cody Badour', date: '2026-10-16', email: 'haw.christina1@gmail.com' },
  { id: '60d2e2fa-a479-4928-b84a-b47fad74d776', bride: 'Christina Valenti', groom: 'Eric Baby', date: '2026-10-17', email: 'ericchristinawedding2027@gmail.com' },
  { id: 'fd821f61-113a-4f31-aea0-de833554a21e', bride: 'Trina Drage', groom: 'Matt Sestric', date: '2026-10-24', email: 'trinadrage10@gmail.com' },
  { id: 'c91a626b-1679-4fdc-9a6a-f593853c6df4', bride: 'Jenna Lehoux', groom: 'Curtis Richards', date: '2026-12-05', email: 'curtisjenna1910@gmail.com' },
  { id: 'bd2dd9b5-0f14-43fd-8f9c-ea369d62fd88', bride: 'Claire Ketcheson', groom: 'Matthew Dellow-King', date: '2027-02-27', email: 'claire.ketcheson94@gmail.com' },
  { id: '404123d0-e60f-4b84-8a17-8419fe5c0930', bride: 'Alyssa Milordi', groom: 'Pasquale Pugliese', date: '2027-05-22', email: 'alyssamilordi@hotmail.com' },
  { id: 'adc8e819-f621-4bbf-92bc-d2aba0a83cd1', bride: 'Victoria Tancredi', groom: 'Alberto Mastrofrancesco', date: '2027-07-10', email: 'Victoria.Tancredi@hotmail.com' },
  { id: 'e8f73d74-0fe6-4878-bedb-e3c3e7b44f68', bride: 'Ariana Prassinos', groom: 'James Vrankovic', date: '2027-07-17', email: 'ariana.prassinos@gmail.com' },
  { id: '53dad9e6-95f8-4a7c-99fc-7352e18e345c', bride: 'Jessica Arruda', groom: 'Kevin Laranja', date: '2027-07-17', email: 'jessica.arruda@live.com' },
  { id: '4812cb9a-80b8-449c-b9df-b0c790b2ed18', bride: 'Victoria Pacheco', groom: 'Luca Cordiano', date: '2027-08-28', email: 'Pachecovictoria4@gmail.com' },
  { id: '993caa6a-35fe-4498-94c8-f70921b3a888', bride: 'Kayley Zizek', groom: 'Spencer Riddell', date: '2027-09-18', email: 'kzizek10@hotmail.com' },
  { id: '5590b653-630e-40b2-af10-a628b04f238f', bride: 'Jacquelyn Barton', groom: 'Gabrial Butler', date: '2027-10-31', email: 'Bartonjacquelyn0@gmail.com' },
];

// ── Manually uploaded (not in Gmail) ─────────────────────────────────
const MANUAL_UPLOADS = [
  { bride: 'Darylliegh', groom: 'CJ', date: '2026-09-05', coupleId: '89922ea9-1172-492a-978d-715beb5449cd' },
  { bride: 'Edzenia', groom: 'Martin', date: '2025-10-25', coupleId: 'af702f5f-ac09-4fa6-94f8-d391d4268c5e' },
];

// ── Helpers ──────────────────────────────────────────────────────────

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, '');
}

function firstNameMatch(dbName: string, subjectName: string): boolean {
  const dbFirst = norm(dbName.split(' ')[0]);
  const subjFirst = norm(subjectName);
  if (!dbFirst || !subjFirst) return false;
  if (dbFirst === subjFirst) return true;
  // Partial match: "Gabby" vs "Gabrielle", "Terri" vs "Terri-Lynn"
  if (dbFirst.startsWith(subjFirst) || subjFirst.startsWith(dbFirst)) return true;
  return false;
}

function parseDateFromSubject(subject: string): string | null {
  // Try explicit YYYY-MM-DD in subject
  const isoMatch = subject.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  // Try "Month Day, Year" or "Month Day Year" patterns
  const clean = subject.replace(/[_&;]/g, ' ').replace(/,/g, ' ').replace(/\s+/g, ' ');
  const words = clean.split(' ');

  for (let i = 0; i < words.length; i++) {
    const monthNum = MONTHS[words[i].toLowerCase().replace(/[^a-z]/g, '')];
    if (!monthNum) continue;

    // Look for day and year after month
    let day: number | null = null;
    let year: number | null = null;

    for (let j = i + 1; j < Math.min(i + 4, words.length); j++) {
      const num = parseInt(words[j].replace(/\D/g, ''), 10);
      if (isNaN(num)) continue;
      if (num >= 2024 && num <= 2028) {
        year = num;
      } else if (num >= 1 && num <= 31 && day === null) {
        day = num;
      }
    }

    if (day && year) {
      return `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return null;
}

function parseNamesFromSubject(subject: string): { name1: string; name2: string } {
  let clean = subject
    .replace(/^_/, '')
    .replace(/SIGS_Contract_/i, '')
    .replace(/\(.*?\)/, '')  // Remove parenthetical
    .replace(/PHOTO ONLY/gi, '')
    .replace(/UPDATED/gi, '')
    .replace(/ZOOM/gi, '')
    .replace(/(FRIDAY|SATURDAY|SUNDAY|SAT|SUN|MON|TUE|WED|THU|FRI)/gi, '')
    .replace(/\b\d{1,2}(st|nd|rd|th)\b/gi, '')  // ordinals
    .replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December)\b/gi, '')
    .replace(/\b\d{4}\b/g, '')  // years
    .replace(/\b\d{1,2}\b/g, '')  // remaining numbers
    .replace(/[_,;]/g, ' ')
    .replace(/\b(CBS|HBS|MBS|OBS|RB|C Hotel|Diplomat|Gardens|Bellvue|Manor|Paradise|Crystal|Fountain|Marquis|Garden|Trail|Hub|Lakeview|Arlington|Opal|Palace|White|Oaks|Niagara|Parkview|Guelph|Brantford|Royal|Ambassador)\b/gi, '')
    .replace(/\bpm\b/gi, '')
    .trim()
    .replace(/\s+/g, ' ');

  // Try "Name & Name" or "Name and Name"
  const ampMatch = clean.match(/^([A-Za-z-]+)\s*[&]\s*([A-Za-z-]+)/i);
  if (ampMatch) return { name1: ampMatch[1].trim(), name2: ampMatch[2].trim() };

  const andMatch = clean.match(/^([A-Za-z-]+)\s+and\s+([A-Za-z-]+)/i);
  if (andMatch) return { name1: andMatch[1].trim(), name2: andMatch[2].trim() };

  // Try "Name Name" (two words = two first names)
  const twoWords = clean.split(/\s+/).filter(w => w.length > 1 && /^[A-Za-z-]+$/.test(w));
  if (twoWords.length >= 2) {
    return { name1: twoWords[0], name2: twoWords[1] };
  }
  if (twoWords.length === 1) {
    return { name1: twoWords[0], name2: '' };
  }

  return { name1: '', name2: '' };
}

function datesMatch(dbDate: string, subjectDate: string): boolean {
  return dbDate === subjectDate;
}

function datesClose(dbDate: string, subjectDate: string): boolean {
  const d1 = new Date(dbDate + 'T12:00:00');
  const d2 = new Date(subjectDate + 'T12:00:00');
  const diffDays = Math.abs((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 7;
}

function monthDayMatch(dbDate: string, month: number, day: number): boolean {
  const [, m, d] = dbDate.split('-').map(Number);
  return m === month && d === day;
}

// ── Special overrides for tricky subjects ────────────────────────────
// Barbara & Bernie subject says "Oct 4,2025" but DB date is 2026-10-03
const SPECIAL_NOTES: Record<string, string> = {
  '1921bfab2d0b6466': 'Spec note: wedding date is 2026-10-03 not 2025',
};

// ── Main matching logic ──────────────────────────────────────────────

interface MatchResult {
  couple_id: string;
  db_bride: string;
  db_groom: string;
  db_date: string;
  db_email: string;
  gmail_id: string;
  gmail_subject: string;
  gmail_date: string;
  match_confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NO_MATCH';
  notes: string;
}

const results: MatchResult[] = [];
const usedCoupleIds = new Set<string>();

for (const msg of GMAIL_MESSAGES) {
  const { name1, name2 } = parseNamesFromSubject(msg.subject);
  const subjectDate = parseDateFromSubject(msg.subject);

  // Also extract month+day without year for partial matching
  let partialMonth: number | null = null;
  let partialDay: number | null = null;
  if (!subjectDate) {
    const clean = msg.subject.replace(/[_&;,]/g, ' ').replace(/\s+/g, ' ');
    const words = clean.split(' ');
    for (let i = 0; i < words.length; i++) {
      const mNum = MONTHS[words[i].toLowerCase().replace(/[^a-z]/g, '')];
      if (!mNum) continue;
      for (let j = i + 1; j < Math.min(i + 3, words.length); j++) {
        const d = parseInt(words[j].replace(/\D/g, ''), 10);
        if (d >= 1 && d <= 31) { partialMonth = mNum; partialDay = d; break; }
      }
      if (partialMonth) break;
    }
  }

  let bestMatch: DbCouple | null = null;
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NO_MATCH' = 'NO_MATCH';
  const notes: string[] = [];

  if (SPECIAL_NOTES[msg.id]) {
    notes.push(SPECIAL_NOTES[msg.id]);
  }

  // Score each DB couple
  let bestScore = 0;
  for (const couple of DB_COUPLES) {
    let score = 0;

    const name1MatchesBride = firstNameMatch(couple.bride, name1);
    const name1MatchesGroom = firstNameMatch(couple.groom, name1);
    const name2MatchesBride = name2 ? firstNameMatch(couple.bride, name2) : false;
    const name2MatchesGroom = name2 ? firstNameMatch(couple.groom, name2) : false;

    // Best case: name1→bride, name2→groom (or vice versa)
    if ((name1MatchesBride && name2MatchesGroom) || (name1MatchesGroom && name2MatchesBride)) {
      score += 3;
    } else if (name1MatchesBride || name1MatchesGroom || name2MatchesBride || name2MatchesGroom) {
      score += 1;
    }

    if (subjectDate && datesMatch(couple.date, subjectDate)) {
      score += 3;
    } else if (subjectDate && datesClose(couple.date, subjectDate)) {
      score += 1;
    } else if (!subjectDate && partialMonth && partialDay && monthDayMatch(couple.date, partialMonth, partialDay)) {
      score += 2;  // Month+day match without year
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = couple;
    }
  }

  if (bestMatch && bestScore >= 5) {
    confidence = 'HIGH';
  } else if (bestMatch && bestScore >= 3) {
    confidence = 'MEDIUM';
  } else if (bestMatch && bestScore >= 1) {
    confidence = 'LOW';
  } else {
    confidence = 'NO_MATCH';
  }

  // Additional notes
  if (bestMatch && subjectDate && !datesMatch(bestMatch.date, subjectDate)) {
    notes.push(`Date mismatch: subject=${subjectDate} db=${bestMatch.date}`);
  }
  if (!name2) {
    notes.push('Only one name extracted from subject');
  }
  if (bestMatch && usedCoupleIds.has(bestMatch.id)) {
    notes.push('Duplicate: couple already matched by another message');
  }

  if (bestMatch && confidence !== 'NO_MATCH') {
    usedCoupleIds.add(bestMatch.id);
  }

  results.push({
    couple_id: bestMatch && confidence !== 'NO_MATCH' ? bestMatch.id : '',
    db_bride: bestMatch && confidence !== 'NO_MATCH' ? bestMatch.bride : '',
    db_groom: bestMatch && confidence !== 'NO_MATCH' ? bestMatch.groom : '',
    db_date: bestMatch && confidence !== 'NO_MATCH' ? bestMatch.date : '',
    db_email: bestMatch && confidence !== 'NO_MATCH' ? (bestMatch.email || '') : '',
    gmail_id: msg.id,
    gmail_subject: msg.subject,
    gmail_date: msg.date,
    match_confidence: confidence,
    notes: notes.join('; '),
  });
}

// ── Output CSV ───────────────────────────────────────────────────────

function csvEscape(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

const header = 'couple_id,db_bride,db_groom,db_date,db_email,gmail_id,gmail_subject,gmail_date,match_confidence,notes';
const rows = results.map(r =>
  [r.couple_id, r.db_bride, r.db_groom, r.db_date, r.db_email, r.gmail_id, r.gmail_subject, r.gmail_date, r.match_confidence, r.notes]
    .map(csvEscape)
    .join(',')
);

const csv = [header, ...rows].join('\n');
const outPath = path.join(process.env.HOME || '~', 'Downloads', 'contract_verification_report.csv');
fs.writeFileSync(outPath, csv, 'utf-8');

// ── Console summary ──────────────────────────────────────────────────

const high = results.filter(r => r.match_confidence === 'HIGH').length;
const med = results.filter(r => r.match_confidence === 'MEDIUM').length;
const low = results.filter(r => r.match_confidence === 'LOW').length;
const none = results.filter(r => r.match_confidence === 'NO_MATCH').length;

console.log('\n═══════════════════════════════════════════════');
console.log('  WO-236 Contract Verification Report');
console.log('═══════════════════════════════════════════════');
console.log(`Total Gmail contracts: ${GMAIL_MESSAGES.length}`);
console.log(`HIGH confidence matches: ${high}`);
console.log(`MEDIUM confidence matches: ${med}`);
console.log(`LOW confidence matches: ${low}`);
console.log(`NO MATCH: ${none}`);
console.log(`Manually uploaded (not in Gmail): Darylliegh & CJ, Edzenia & Martin`);
console.log(`\nReport saved to: ${outPath}`);
console.log('═══════════════════════════════════════════════\n');

// Print problem rows
if (none > 0 || low > 0) {
  console.log('⚠️  Rows needing review:');
  for (const r of results.filter(r => r.match_confidence === 'NO_MATCH' || r.match_confidence === 'LOW')) {
    console.log(`  [${r.match_confidence}] ${r.gmail_subject} → ${r.db_bride || '???'} & ${r.db_groom || '???'} | ${r.notes}`);
  }
  console.log('');
}
