CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS postal_zone(
  id SERIAL PRIMARY KEY,
  zone_id VARCHAR(50) UNIQUE NOT NULL,
  zone_name VARCHAR(150) NOT NULL,
  postal_code VARCHAR(30) UNIQUE NOT NULL,
  emirate VARCHAR(100) NOT NULL DEFAULT 'Dubai',
  status VARCHAR(30) NOT NULL DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS postal_grid(
  id SERIAL PRIMARY KEY,
  grid_id VARCHAR(50) UNIQUE NOT NULL,
  zone_id VARCHAR(50) NOT NULL REFERENCES postal_zone(zone_id) ON UPDATE CASCADE,
  area VARCHAR(150) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Active',
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  geom geometry(Polygon,4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_postal_grid_geom ON postal_grid USING GIST(geom);

CREATE TABLE IF NOT EXISTS address(
  id SERIAL PRIMARY KEY,
  address_id VARCHAR(50) UNIQUE NOT NULL,
  recipient_name VARCHAR(150) DEFAULT '',
  organization_name VARCHAR(150) DEFAULT '',
  unit_type VARCHAR(50) DEFAULT '',
  unit_number VARCHAR(50) DEFAULT '',
  building_name VARCHAR(150) NOT NULL,
  building_number VARCHAR(50) DEFAULT '',
  street_name VARCHAR(150) DEFAULT '',
  street_type VARCHAR(50) DEFAULT 'Street',
  area_locality VARCHAR(150) DEFAULT '',
  emirate_admin_area VARCHAR(100) DEFAULT 'Dubai',
  postal_code VARCHAR(30) NOT NULL,
  country_code VARCHAR(2) DEFAULT 'AE',
  country_name VARCHAR(100) DEFAULT 'UNITED ARAB EMIRATES',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  grid_id VARCHAR(50) NOT NULL REFERENCES postal_grid(grid_id) ON UPDATE CASCADE,
  zone_id VARCHAR(50) NOT NULL REFERENCES postal_zone(zone_id) ON UPDATE CASCADE,
  makani_number VARCHAR(50) DEFAULT '',
  onwani_reference VARCHAR(100) DEFAULT '',
  search_aliases VARCHAR(300) DEFAULT '',
  template_version VARCHAR(50) DEFAULT 'UAE-DEMO-v1.0',
  status VARCHAR(30) DEFAULT 'Verified',
  point geometry(Point,4326)
);

CREATE INDEX IF NOT EXISTS ix_address_point ON address USING GIST(point);
CREATE INDEX IF NOT EXISTS ix_address_postal_code ON address(postal_code);

-- 15 postal zones: Dubai Silicon Oasis (8) + Al Barsha (7)
INSERT INTO postal_zone(zone_id,zone_name,postal_code,emirate,status) VALUES ('Z-DSO-01','Silicon Oasis North A','DXB-10450','Dubai','Active') ON CONFLICT DO NOTHING;
INSERT INTO postal_zone(zone_id,zone_name,postal_code,emirate,status) VALUES ('Z-DSO-02','Silicon Oasis North B','DXB-10451','Dubai','Active') ON CONFLICT DO NOTHING;
INSERT INTO postal_zone(zone_id,zone_name,postal_code,emirate,status) VALUES ('Z-DSO-03','Silicon Oasis North C','DXB-10452','Dubai','Active') ON CONFLICT DO NOTHING;
INSERT INTO postal_zone(zone_id,zone_name,postal_code,emirate,status) VALUES ('Z-DSO-04','Silicon Oasis Central A','DXB-10453','Dubai','Active') ON CONFLICT DO NOTHING;
INSERT INTO postal_zone(zone_id,zone_name,postal_code,emirate,status) VALUES ('Z-DSO-05','Silicon Oasis Central B','DXB-10454','Dubai','Active') ON CONFLICT DO NOTHING;
INSERT INTO postal_zone(zone_id,zone_name,postal_code,emirate,status) VALUES ('Z-DSO-06','Silicon Oasis South Extension','DXB-10455','Dubai','Active') ON CONFLICT DO NOTHING;
INSERT INTO postal_zone(zone_id,zone_name,postal_code,emirate,status) VALUES ('Z-DSO-07','Silicon Oasis Logistics Cluster','DXB-10456','Dubai','Active') ON CONFLICT DO NOTHING;
INSERT INTO postal_zone(zone_id,zone_name,postal_code,emirate,status) VALUES ('Z-DSO-08','Silicon Oasis Academic Cluster','DXB-10457','Dubai','Active') ON CONFLICT DO NOTHING;
INSERT INTO postal_zone(zone_id,zone_name,postal_code,emirate,status) VALUES ('Z-ALB-01','Al Barsha 1','DXB-20450','Dubai','Active') ON CONFLICT DO NOTHING;
INSERT INTO postal_zone(zone_id,zone_name,postal_code,emirate,status) VALUES ('Z-ALB-02','Al Barsha 2','DXB-20451','Dubai','Active') ON CONFLICT DO NOTHING;
INSERT INTO postal_zone(zone_id,zone_name,postal_code,emirate,status) VALUES ('Z-ALB-03','Al Barsha 3','DXB-20452','Dubai','Active') ON CONFLICT DO NOTHING;
INSERT INTO postal_zone(zone_id,zone_name,postal_code,emirate,status) VALUES ('Z-ALB-04','Al Barsha South 1','DXB-20453','Dubai','Active') ON CONFLICT DO NOTHING;
INSERT INTO postal_zone(zone_id,zone_name,postal_code,emirate,status) VALUES ('Z-ALB-05','Al Barsha South 2','DXB-20454','Dubai','Active') ON CONFLICT DO NOTHING;
INSERT INTO postal_zone(zone_id,zone_name,postal_code,emirate,status) VALUES ('Z-ALB-06','Al Barsha Mall District Reserve','DXB-20455','Dubai','Active') ON CONFLICT DO NOTHING;
INSERT INTO postal_zone(zone_id,zone_name,postal_code,emirate,status) VALUES ('Z-ALB-07','Al Barsha Heights Reserve','DXB-20456','Dubai','Active') ON CONFLICT DO NOTHING;

-- 10 postal grids (5 Dubai Silicon Oasis + 5 Al Barsha)
INSERT INTO postal_grid(grid_id,zone_id,area,status,center_lat,center_lng,geom)
VALUES ('GRD-001','Z-DSO-01','Dubai Silicon Oasis','Active',25.1145,55.368,ST_GeomFromText('POLYGON((55.364000000000004 25.1115,55.372 25.1115,55.372 25.1175,55.364000000000004 25.1175,55.364000000000004 25.1115))',4326))
ON CONFLICT DO NOTHING;

INSERT INTO postal_grid(grid_id,zone_id,area,status,center_lat,center_lng,geom)
VALUES ('GRD-002','Z-DSO-02','Dubai Silicon Oasis','Active',25.1145,55.376,ST_GeomFromText('POLYGON((55.372 25.1115,55.379999999999995 25.1115,55.379999999999995 25.1175,55.372 25.1175,55.372 25.1115))',4326))
ON CONFLICT DO NOTHING;

INSERT INTO postal_grid(grid_id,zone_id,area,status,center_lat,center_lng,geom)
VALUES ('GRD-003','Z-DSO-03','Dubai Silicon Oasis','Active',25.1145,55.384,ST_GeomFromText('POLYGON((55.38 25.1115,55.388 25.1115,55.388 25.1175,55.38 25.1175,55.38 25.1115))',4326))
ON CONFLICT DO NOTHING;

INSERT INTO postal_grid(grid_id,zone_id,area,status,center_lat,center_lng,geom)
VALUES ('GRD-004','Z-DSO-04','Dubai Silicon Oasis','Active',25.1245,55.372,ST_GeomFromText('POLYGON((55.368 25.1215,55.376 25.1215,55.376 25.1275,55.368 25.1275,55.368 25.1215))',4326))
ON CONFLICT DO NOTHING;

INSERT INTO postal_grid(grid_id,zone_id,area,status,center_lat,center_lng,geom)
VALUES ('GRD-005','Z-DSO-05','Dubai Silicon Oasis','Active',25.1245,55.38,ST_GeomFromText('POLYGON((55.376000000000005 25.1215,55.384 25.1215,55.384 25.1275,55.376000000000005 25.1275,55.376000000000005 25.1215))',4326))
ON CONFLICT DO NOTHING;

INSERT INTO postal_grid(grid_id,zone_id,area,status,center_lat,center_lng,geom)
VALUES ('GRD-006','Z-ALB-01','Al Barsha','Active',25.1136,55.201,ST_GeomFromText('POLYGON((55.197 25.1106,55.205 25.1106,55.205 25.116600000000002,55.197 25.116600000000002,55.197 25.1106))',4326))
ON CONFLICT DO NOTHING;

INSERT INTO postal_grid(grid_id,zone_id,area,status,center_lat,center_lng,geom)
VALUES ('GRD-007','Z-ALB-02','Al Barsha','Active',25.101,55.211,ST_GeomFromText('POLYGON((55.207 25.098,55.214999999999996 25.098,55.214999999999996 25.104,55.207 25.104,55.207 25.098))',4326))
ON CONFLICT DO NOTHING;

INSERT INTO postal_grid(grid_id,zone_id,area,status,center_lat,center_lng,geom)
VALUES ('GRD-008','Z-ALB-03','Al Barsha','Active',25.096,55.221,ST_GeomFromText('POLYGON((55.217 25.093,55.224999999999994 25.093,55.224999999999994 25.099,55.217 25.099,55.217 25.093))',4326))
ON CONFLICT DO NOTHING;

INSERT INTO postal_grid(grid_id,zone_id,area,status,center_lat,center_lng,geom)
VALUES ('GRD-009','Z-ALB-04','Al Barsha','Active',25.054,55.227,ST_GeomFromText('POLYGON((55.223 25.051,55.230999999999995 25.051,55.230999999999995 25.057,55.223 25.057,55.223 25.051))',4326))
ON CONFLICT DO NOTHING;

INSERT INTO postal_grid(grid_id,zone_id,area,status,center_lat,center_lng,geom)
VALUES ('GRD-010','Z-ALB-05','Al Barsha','Active',25.045,55.234,ST_GeomFromText('POLYGON((55.230000000000004 25.042,55.238 25.042,55.238 25.048000000000002,55.230000000000004 25.048000000000002,55.230000000000004 25.042))',4326))
ON CONFLICT DO NOTHING;


-- 35 addresses (18 Dubai Silicon Oasis + 17 Al Barsha), each with a sample Makani number
INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001246','Imran Fernandes','Bright Path Education','Shop','G16',
  'Oasis Heights','7','Oasis Boulevard','Street',
  'Dubai Silicon Oasis','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.1127,55.3668,g.grid_id,g.zone_id,'3985210001','','Oasis Twin Tower',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.3668,25.1127),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-001'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.3668,25.1127),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001247','Rashid Sultan','Crescent Health','Office','447',
  'Market Square','9','Oasis Boulevard','Street',
  'Dubai Silicon Oasis','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.1163,55.3668,g.grid_id,g.zone_id,'3985210138','','',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.3668,25.1163),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-001'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.3668,25.1163),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001248','Mona Joseph','','Apartment','448',
  'Knowledge Centre','31','University Road','Street',
  'Dubai Silicon Oasis','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.1163,55.3692,g.grid_id,g.zone_id,'3985210275','ONW-DEMO-24001','Knowledge Hub',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.3692,25.1163),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-001'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.3692,25.1163),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001249','Karim Qureshi','Silverline Logistics','Building','9',
  'Scholar Residence','8','Campus Road','Street',
  'Dubai Silicon Oasis','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.1127,55.3692,g.grid_id,g.zone_id,'3985210412','','',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.3692,25.1127),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-001'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.3692,25.1127),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001250','Aisha Al Mheiri','Quantum Research','Warehouse','10',
  'Research Centre','15','University Road','Street',
  'Dubai Silicon Oasis','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.1127,55.3748,g.grid_id,g.zone_id,'3985210549','','',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.3748,25.1127),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-002'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.3748,25.1127),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001251','Imran Salem','','Villa','11',
  'Learning House','27','Campus Road','Street',
  'Dubai Silicon Oasis','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.1163,55.3748,g.grid_id,g.zone_id,'3985210686','','',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.3748,25.1163),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-002'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.3748,25.1163),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001252','Rashid Al Zaabi','','Shop','G22',
  'Cedars Villas','14','Cedars Road','Street',
  'Dubai Silicon Oasis','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.1163,55.3772,g.grid_id,g.zone_id,'3985210823','','',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.3772,25.1163),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-002'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.3772,25.1163),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001253','Mona Yousuf','Falcon IT Solutions','Office','453',
  'Medical Pavilion','3','Campus Road','Street',
  'Dubai Silicon Oasis','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.1127,55.3772,g.grid_id,g.zone_id,'3985210960','','',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.3772,25.1127),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-002'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.3772,25.1127),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001254','Karim Nair','Nova Labs','Apartment','454',
  'Nexus Business Centre','6','Innovation Drive','Street',
  'Dubai Silicon Oasis','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.1127,55.3828,g.grid_id,g.zone_id,'3985211097','ONW-DEMO-24002','',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.3828,25.1127),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-003'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.3828,25.1127),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001255','Aisha Farooq','','Building','15',
  'Falcon IT Tower','11','Techno Avenue','Street',
  'Dubai Silicon Oasis','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.1163,55.3828,g.grid_id,g.zone_id,'3985211234','','',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.3828,25.1163),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-003'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.3828,25.1163),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001256','Imran Al Hashimi','Nexus Ventures','Warehouse','16',
  'Silicon Gate Residence','19','Oasis Boulevard','Street',
  'Dubai Silicon Oasis','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.1163,55.3852,g.grid_id,g.zone_id,'3985211371','','',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.3852,25.1163),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-003'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.3852,25.1163),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001257','Rashid George','Orbit Systems','Villa','17',
  'Enterprise Court','5','University Road','Street',
  'Dubai Silicon Oasis','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.1127,55.3852,g.grid_id,g.zone_id,'3985211508','','',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.3852,25.1127),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-003'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.3852,25.1127),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001258','Mona Haddad','','Shop','G28',
  'DSO Logistics Hub','2','Cedars Road','Street',
  'Dubai Silicon Oasis','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.1227,55.3708,g.grid_id,g.zone_id,'3985211645','','',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.3708,25.1227),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-004'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.3708,25.1227),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001259','Karim Rahman','Meridian Trading','Office','459',
  'Vantage Offices','17','Campus Road','Street',
  'Dubai Silicon Oasis','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.1263,55.3708,g.grid_id,g.zone_id,'3985211782','','',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.3708,25.1263),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-004'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.3708,25.1263),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001260','Aisha Khan','Atlas Consulting','Apartment','460',
  'Innovation Hub','12','Innovation Drive','Street',
  'Dubai Silicon Oasis','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.1263,55.3732,g.grid_id,g.zone_id,'3985211919','ONW-DEMO-24003','Blue Tower, DSO Blue Tower',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.3732,25.1263),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-004'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.3732,25.1263),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001261','Imran Noor','','Building','21',
  'Silicon Residence','18','Techno Avenue','Street',
  'Dubai Silicon Oasis','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.1227,55.3788,g.grid_id,g.zone_id,'3985212056','','Silicon Res',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.3788,25.1227),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-005'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.3788,25.1227),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001262','Rashid Chaudhry','Vertex Analytics','Warehouse','22',
  'Digital Tower','22','Innovation Drive','Street',
  'Dubai Silicon Oasis','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.1263,55.3788,g.grid_id,g.zone_id,'3985212193','','Tech Tower',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.3788,25.1263),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-005'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.3788,25.1263),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001263','Mona Rahim','Future Academy','Villa','23',
  'Axis Building','4','Techno Avenue','Street',
  'Dubai Silicon Oasis','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.1263,55.3812,g.grid_id,g.zone_id,'3985212330','','',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.3812,25.1263),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-005'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.3812,25.1263),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001264','Karim Raza','','Shop','G4',
  'Al Barsha Community Centre','2','Al Hebiah First Street','Street',
  'Al Barsha','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.1118,55.1998,g.grid_id,g.zone_id,'3985212467','','',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.1998,25.1118),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-006'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.1998,25.1118),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001265','Aisha Al Nuaimi','Bright Path Education','Office','465',
  'Green Park Apartments','19','First Al Khail Street','Street',
  'Al Barsha','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.1154,55.1998,g.grid_id,g.zone_id,'3985212604','','',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.1998,25.1154),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-006'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.1998,25.1154),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001266','Imran Basha','Crescent Health','Apartment','466',
  'University City Residence','5','58A Street','Street',
  'Al Barsha','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.1154,55.2022,g.grid_id,g.zone_id,'3985212741','ONW-DEMO-24004','UCR, University Court',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.2022,25.1154),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-006'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.2022,25.1154),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001267','Rashid Shah','','Building','27',
  'AUD Court','9','Al Hebiah Second Street','Street',
  'Al Barsha','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.1118,55.2022,g.grid_id,g.zone_id,'3985212878','','AUD Residence',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.2022,25.1118),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-006'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.2022,25.1118),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001268','Mona Haidar','Silverline Logistics','Warehouse','28',
  'Emirates Gardens Residence','13','Al Barsha Street','Street',
  'Al Barsha','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.0992,55.2098,g.grid_id,g.zone_id,'3985213015','','',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.2098,25.0992),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-007'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.2098,25.0992),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001269','Karim Kapoor','Quantum Research','Villa','29',
  'Al Barsha South Villas','27','58A Street','Street',
  'Al Barsha','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.1028,55.2098,g.grid_id,g.zone_id,'3985213152','','',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.2098,25.1028),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-007'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.2098,25.1028),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001270','Aisha Hassan','','Shop','G10',
  'Palm Court Offices','4','First Al Khail Street','Street',
  'Al Barsha','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.1028,55.2122,g.grid_id,g.zone_id,'3985213289','','',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.2122,25.1028),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-007'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.2122,25.1028),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001271','Imran Antony','','Office','471',
  'Barsha Pearl Tower','16','Al Hebiah First Street','Street',
  'Al Barsha','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.0942,55.2198,g.grid_id,g.zone_id,'3985213426','','Pearl Tower',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.2198,25.0942),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-008'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.2198,25.0942),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001272','Rashid Thomas','Falcon IT Solutions','Apartment','472',
  'Union Court Residence','12','Al Barsha Street','Street',
  'Al Barsha','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.0978,55.2198,g.grid_id,g.zone_id,'3985213563','ONW-DEMO-24005','',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.2198,25.0978),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-008'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.2198,25.0978),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001273','Mona Ahmed','Nova Labs','Building','33',
  'Skyline Business Bay','7','Al Hebiah Second Street','Street',
  'Al Barsha','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.0978,55.2222,g.grid_id,g.zone_id,'3985213700','','',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.2222,25.0978),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-008'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.2222,25.0978),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001274','Karim Al Suwaidi','','Warehouse','34',
  'Meadows Edge Apartments','23','58A Street','Street',
  'Al Barsha','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.0942,55.2222,g.grid_id,g.zone_id,'3985213837','','',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.2222,25.0942),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-008'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.2222,25.0942),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001275','Aisha Iqbal','Nexus Ventures','Villa','35',
  'Barsha Heights Tower','3','Al Hebiah First Street','Street',
  'Al Barsha','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.0522,55.2258,g.grid_id,g.zone_id,'3985213974','','BHT, Barsha Tower',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.2258,25.0522),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-009'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.2258,25.0522),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001276','Imran Ali','Orbit Systems','Shop','G16',
  'Mall Avenue Residence','21','Al Barsha Street','Street',
  'Al Barsha','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.0558,55.2258,g.grid_id,g.zone_id,'3985214111','','Mall Ave Res',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.2258,25.0558),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-009'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.2258,25.0558),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001277','Rashid Al Marri','','Office','477',
  'Al Barsha Business Centre','8','First Al Khail Street','Street',
  'Al Barsha','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.0558,55.2282,g.grid_id,g.zone_id,'3985214248','','ABBC',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.2282,25.0558),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-009'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.2282,25.0558),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001278','Mona Al Falasi','Meridian Trading','Apartment','478',
  'Al Hebiah Complex','14','Al Hebiah Second Street','Street',
  'Al Barsha','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.0432,55.2328,g.grid_id,g.zone_id,'3985214385','ONW-DEMO-24006','',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.2328,25.0432),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-010'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.2328,25.0432),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001279','Karim Osman','Atlas Consulting','Building','39',
  'South Ridge Residence','6','58A Street','Street',
  'Al Barsha','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.0468,55.2328,g.grid_id,g.zone_id,'3985214522','','',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.2328,25.0468),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-010'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.2328,25.0468),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO address(
  address_id,recipient_name,organization_name,unit_type,unit_number,
  building_name,building_number,street_name,street_type,
  area_locality,emirate_admin_area,postal_code,country_code,country_name,
  latitude,longitude,grid_id,zone_id,makani_number,onwani_reference,search_aliases,
  template_version,status,point
)
SELECT
  'ADD-001280','Aisha Menon','','Warehouse','0',
  'Sunset Mall Building','10','Al Barsha Street','Street',
  'Al Barsha','Dubai',z.postal_code,'AE','UNITED ARAB EMIRATES',
  25.0468,55.2352,g.grid_id,g.zone_id,'3985214659','','Sunset Mall',
  'UAE-DEMO-v1.0','Verified',ST_SetSRID(ST_Point(55.2352,25.0468),4326)
FROM postal_grid g
JOIN postal_zone z ON z.zone_id=g.zone_id
WHERE g.grid_id = 'GRD-010'
  AND ST_Covers(g.geom,ST_SetSRID(ST_Point(55.2352,25.0468),4326))
LIMIT 1
ON CONFLICT DO NOTHING;

